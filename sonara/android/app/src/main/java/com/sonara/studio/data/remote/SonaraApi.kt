package com.sonara.studio.data.remote

import okhttp3.MultipartBody
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.Part
import retrofit2.http.Path

interface SonaraApi {
    @GET("v1/health")
    suspend fun health(): HealthResponse

    @GET("v1/models")
    suspend fun models(): ModelsResponse

    @POST("v1/generate")
    suspend fun generate(@Body body: GenerateRequest): JobResponse

    @POST("v1/extend")
    suspend fun extend(@Body body: ExtendRequest): JobResponse

    @POST("v1/cover")
    suspend fun cover(@Body body: CoverRequest): JobResponse

    @POST("v1/stems")
    suspend fun stems(@Body body: StemsRequest): JobResponse

    @GET("v1/jobs/{id}")
    suspend fun job(@Path("id") id: String): JobResponse

    @POST("v1/lyrics")
    suspend fun lyrics(@Body body: LyricsRequest): LyricsResponse

    @Multipart
    @POST("v1/upload")
    suspend fun upload(@Part file: MultipartBody.Part): UploadResponse
}
