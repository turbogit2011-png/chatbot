# Szablony i wykończenie

## Szablony

Każdy to klasa implementująca `Scene` w `engine/.../visual/templates/`.

| Szablon | Co robi | Domyślne wykończenie | Tekst |
|---|---|---|---|
| **Lyric Slam** | wielka typografia na kolorze albo na zduotonowanych zdjęciach, pasek na downbeat, znaczniki narożne | Hard | słowa wbijane |
| **Photo Cut** | Twoje zdjęcia cięte na downbeatach, biały błysk na cięciu, licznik ujęć, boczna linijka postępu | Film | stos linii |
| **VHS** | pasmo tracking, scanlines, OSD kamery z zegarem | VHS | karaoke |
| **Bloomscape** | pierścień świateł i rdzeń oddychający basem, prawie nic nie rysuje — robotę robi bloom | Dream | baner |
| **Editorial** | druk: siatka, włosowe linie, metadane, widmo jako element typograficzny | Clean | stos linii |
| **Strobe** | kolor całej klatki zmienia się na bit, bloki wyskakują z boków | Hard | baner |
| **Split Grid** | siatka 2×3 z Twoich zdjęć, jedna komórka podmienia się na każdy bit | Film | baner |

Tryb **Auto** rozdaje szablony po sekcjach utworu w kolejności zależnej od ziarna,
więc dwa klipy z tego samego pliku są różne, ale ten sam seed daje ten sam montaż.
Szablony oznaczone `wantsMedia` są pomijane w trybie Auto, gdy nie ma zdjęć.

## Podanie tekstu

| Styl | Zachowanie |
|---|---|
| `pop` | słowa pojawiają się pojedynczo, skalując się w miejsce; aktywne dostaje podkreślenie i poświatę |
| `karaoke` | cała linia widoczna, zaśpiewane słowa przechodzą na kolor akcentu |
| `stack` | linie układają się w stos, starsze cofają się i gasną |
| `banner` | jedna linia przez całą szerokość, wjazd i wyjazd |

Rozmiar jest dobierany wyszukiwaniem binarnym tak, żeby linia zmieściła się
w zadanej liczbie wierszy — długa linia nigdy nie wyjdzie poza kadr, krótka nie będzie
się gubić.

## Wykończenie

`FxSettings` steruje łańcuchem pikselowym. Gotowe looki: `Clean`, `Film`, `Vhs`,
`Hard`, `Dream`, `Flat` (wyłączony).

| Etap | Uwagi |
|---|---|
| Smugi | mieszanie z poprzednią klatką; resetowane przy zmianie szablonu |
| Glitch | przesunięcia poziomych pasm z rozjazdem kanałów, tylko na transiencie |
| Aberracja | rozjazd R/B głównie w poziomie — składowa pionowa jest mała, bo na drobnym tekście czyta się jako podwójna ekspozycja |
| Bloom | podbicie w ćwiartce rozdzielczości, rozmycie trzema przebiegami box, kompozycja razem z gradingiem |
| Halacja | ciepłe halo wokół podświetleń, dokładane w tym samym przebiegu |
| Grading | kontrast i lift z tablicy 256-elementowej, saturacja, winieta z prekalkulowanej maski, scanlines, ziarno |

**Ziarno jest budowane w połowie rozdzielczości.** Szum per-piksel to nie film, tylko
szum cyfrowy, i jest najgorszym możliwym wejściem dla kodeka — ten sam klip z ziarnem
per-piksel ważył 183 MB zamiast 73 MB.

## Dodanie szablonu

1. Napisz klasę implementującą `Scene` (`id`, `displayName`, `render`, opcjonalnie
   `reset`, `fx`, `wantsMedia`, `lyricStyle`, `drawsOwnCredits`).
2. Dopisz ją do `Director.available()`.
3. Obejrzyj wynik bez telefonu:

```bash
cd pulse/android
./gradlew :preview:run --args="--stills /tmp/stills --media ~/fotki --lyrics tekst.txt"
```

### Zasady, które się sprawdziły

* **Jeśli szablon rysuje własny podpis**, ustaw `drawsOwnCredits` — inaczej w rogu
  wylądują dwa tytuły jeden na drugim.
* **Uważaj z addytywnym rysowaniem pod bloomem.** Kilka nałożonych warstw additive
  plus bloom to biała plama; to zabiło dwa wczesne style.
* **Stopy gradientu muszą rosnąć.** Pierścień, którego wewnętrzny stop zbiega do zera,
  przestaje być pierścieniem i staje się wypełnionym dyskiem.
* **Nie dawaj wszystkim elementom wspólnej fazy** — pole cząsteczek ze wspólnym
  zawirowaniem po kilku sekundach zbija się w jeden pas.
