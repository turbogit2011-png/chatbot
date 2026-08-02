// Dedykowany shader śniegu dla URP (mobile-first).
// - Fizyczne odkształcanie pod nartami: wierzchołki spychane w dół wg maski
//   kolein renderowanej do _DeformationMap (RenderTexture aktualizowana przez
//   skrypt SnowDeformationRenderer rysujący ślad nart kamerą ortho top-down).
// - Wind Motion Blur: subtelne przesuwanie szczytowej warstwy sparkli w kierunku
//   wiatru (_WindDir, _WindSpeed) — tani efekt "zamieci" bez post-processu.
// Jeden pass, bez tessellacji — celuje w 60–120 FPS na średnich urządzeniach.
Shader "SkiJump/URP/SnowDeform"
{
    Properties
    {
        _BaseMap        ("Albedo śniegu", 2D) = "white" {}
        _SparkleMap     ("Mapa iskrzenia", 2D) = "black" {}
        _DeformationMap ("Mapa odkształceń (R = głębokość)", 2D) = "black" {}
        _DeformDepth    ("Maks. głębokość koleiny [m]", Range(0, 0.5)) = 0.18
        _TrackDarken    ("Przyciemnienie koleiny", Range(0, 1)) = 0.35
        _WindDir        ("Kierunek wiatru XZ", Vector) = (1, 0, 0, 0)
        _WindSpeed      ("Siła rozmycia wiatrem", Range(0, 2)) = 0.4
        _Tint           ("Odcień", Color) = (0.96, 0.97, 1.0, 1)
    }

    SubShader
    {
        Tags { "RenderType"="Opaque" "RenderPipeline"="UniversalPipeline" "Queue"="Geometry" }
        LOD 200

        Pass
        {
            Name "ForwardLit"
            Tags { "LightMode"="UniversalForward" }

            HLSLPROGRAM
            #pragma vertex   Vert
            #pragma fragment Frag
            #pragma multi_compile _ _MAIN_LIGHT_SHADOWS _MAIN_LIGHT_SHADOWS_CASCADE
            #pragma multi_compile_fog

            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"

            TEXTURE2D(_BaseMap);        SAMPLER(sampler_BaseMap);
            TEXTURE2D(_SparkleMap);     SAMPLER(sampler_SparkleMap);
            TEXTURE2D(_DeformationMap); SAMPLER(sampler_DeformationMap);

            CBUFFER_START(UnityPerMaterial)
                float4 _BaseMap_ST;
                float  _DeformDepth;
                float  _TrackDarken;
                float4 _WindDir;
                float  _WindSpeed;
                float4 _Tint;
            CBUFFER_END

            struct Attributes
            {
                float4 positionOS : POSITION;
                float3 normalOS   : NORMAL;
                float2 uv         : TEXCOORD0;
                float2 uvDeform   : TEXCOORD1; // UV w przestrzeni mapy odkształceń
            };

            struct Varyings
            {
                float4 positionCS : SV_POSITION;
                float2 uv         : TEXCOORD0;
                float2 uvDeform   : TEXCOORD1;
                float3 normalWS   : TEXCOORD2;
                float3 positionWS : TEXCOORD3;
                float  fogFactor  : TEXCOORD4;
            };

            Varyings Vert(Attributes IN)
            {
                Varyings OUT;

                // Odkształcenie: kanał R mapy kolein spycha wierzchołek w dół normalnej.
                float depth = SAMPLE_TEXTURE2D_LOD(
                    _DeformationMap, sampler_DeformationMap, IN.uvDeform, 0).r;
                IN.positionOS.xyz -= IN.normalOS * depth * _DeformDepth;

                VertexPositionInputs pos = GetVertexPositionInputs(IN.positionOS.xyz);
                OUT.positionCS = pos.positionCS;
                OUT.positionWS = pos.positionWS;
                OUT.normalWS   = TransformObjectToWorldNormal(IN.normalOS);
                OUT.uv         = TRANSFORM_TEX(IN.uv, _BaseMap);
                OUT.uvDeform   = IN.uvDeform;
                OUT.fogFactor  = ComputeFogFactor(pos.positionCS.z);
                return OUT;
            }

            half4 Frag(Varyings IN) : SV_Target
            {
                half3 albedo = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, IN.uv).rgb
                               * _Tint.rgb;

                // Koleina: przyciemnienie + spłaszczenie normalnej (mokry, ubity śnieg).
                half depth = SAMPLE_TEXTURE2D(_DeformationMap, sampler_DeformationMap,
                                              IN.uvDeform).r;
                albedo *= 1.0h - depth * _TrackDarken;

                // Wind Motion Blur: warstwa sparkli scrollowana wiatrem — dwie próbki
                // wzdłuż kierunku wiatru dają tanie rozmycie kierunkowe.
                float2 windUV = IN.uv + _WindDir.xz * (_Time.y * _WindSpeed * 0.15);
                half s0 = SAMPLE_TEXTURE2D(_SparkleMap, sampler_SparkleMap, windUV).r;
                half s1 = SAMPLE_TEXTURE2D(_SparkleMap, sampler_SparkleMap,
                                           windUV + _WindDir.xz * 0.01).r;
                albedo += (s0 + s1) * 0.25h * saturate(_WindSpeed);

                // Oświetlenie Lambert + cień głównego światła (wystarczające dla śniegu).
                float4 shadowCoord = TransformWorldToShadowCoord(IN.positionWS);
                Light  mainLight   = GetMainLight(shadowCoord);
                half   ndotl = saturate(dot(normalize(IN.normalWS), mainLight.direction));
                half3  color = albedo * mainLight.color
                               * (ndotl * mainLight.shadowAttenuation * 0.85h + 0.35h);

                color = MixFog(color, IN.fogFactor);
                return half4(color, 1);
            }
            ENDHLSL
        }
    }
    FallBack "Universal Render Pipeline/Simple Lit"
}
