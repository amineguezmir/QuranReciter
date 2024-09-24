"use client";

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Fuse from "fuse.js";
import { FaMicrophone, FaSpinner } from "react-icons/fa";

// Tooltip component
const Tooltip = ({ message, children }) => {
  return (
    <div className="relative inline-block group">
      {children}
      <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 w-max p-2 text-white bg-gray-700 rounded-md text-sm opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        {message}
      </div>
    </div>
  );
};

export default function QuranAudioPlayer() {
  const [surahs, setSurahs] = useState([]);
  const [ayahs, setAyahs] = useState([]);
  const [selectedSurah, setSelectedSurah] = useState("");
  const [selectedAyah, setSelectedAyah] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [tafseerText, setTafseerText] = useState("");
  const [selectedAyahText, setSelectedAyahText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    const fetchSurahs = async () => {
      try {
        const response = await axios.get("https://mp3quran.net/api/v3/suwar");
        setSurahs(response.data.suwar);
      } catch (error) {
        console.error("Error fetching surahs:", error);
      }
    };

    fetchSurahs();
  }, []);

  const handleSurahChange = async (surahId) => {
    setSelectedSurah(surahId);
    setSelectedAyah("");
    setTafseerText("");
    setAudioUrl("");
    setSelectedAyahText("");

    try {
      const response = await axios.get(
        `https://api.quran.com/api/v4/quran/verses/indopak`,
        {
          params: { chapter_number: surahId },
          headers: { Accept: "application/json" },
        }
      );

      setAyahs(response.data.verses);
    } catch (error) {
      console.error("Error fetching ayahs:", error);
    }
  };

  const handleAyahChange = async (ayahKey) => {
    setSelectedAyah(ayahKey);

    const [surah, ayah] = ayahKey.split(":");
    const totalAyahs = ayahs.length;

    if (parseInt(ayah) < 1 || parseInt(ayah) > totalAyahs) {
      console.error(`Ayah ${ayah} does not exist in Surah ${surah}`);
      return;
    }

    const selectedAyahObject = ayahs.find((a) => a.verse_key === ayahKey);
    if (selectedAyahObject) {
      setSelectedAyahText(selectedAyahObject.text_indopak);
    }

    const paddedSurah = surah.padStart(3, "0");
    const paddedAyah = ayah.padStart(3, "0");

    const newAudioUrl = `https://verses.quran.com/AbdulBaset/Mujawwad/mp3/${paddedSurah}${paddedAyah}.mp3`;
    setAudioUrl(newAudioUrl);

    const tafseer_id = 1;
    const tafsirUrl = `http://api.quran-tafseer.com/tafseer/${tafseer_id}/${surah}/${ayah}/${ayah}`;

    try {
      const tafseerResponse = await axios.get(tafsirUrl);

      if (
        Array.isArray(tafseerResponse.data) &&
        tafseerResponse.data.length > 0
      ) {
        setTafseerText(tafseerResponse.data[0].text);
      } else {
        setTafseerText("No tafsir available for this ayah.");
      }
    } catch (error) {
      console.error("Error fetching tafseer:", error);
    }
  };

  const normalizeText = (text) => {
    return text
      .replace(/[\u064B-\u0652]/g, "")
      .replace(/[^\u0621-\u064A\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  const handleVoiceRecording = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.error("SpeechRecognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "ar-SA";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsRecording(true);
    recognition.start();

    recognition.onresult = (event) => {
      const spokenText = event.results[0][0].transcript;
      findMatchingAyah(spokenText);
      setIsRecording(false);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsRecording(false);
    };
  };

  const findMatchingAyah = (spokenText) => {
    const normalizedSpokenText = normalizeText(spokenText);
    const ayahTexts = ayahs.map((ayah) => normalizeText(ayah.text_indopak));

    const fuse = new Fuse(ayahTexts, {
      threshold: 0.3,
      includeScore: true,
    });

    const results = fuse.search(normalizedSpokenText);

    if (results.length > 0) {
      const matchingAyahIndex = results[0].refIndex;
      handleAyahChange(ayahs[matchingAyahIndex].verse_key);
    } else {
      console.log("No matching ayah found.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-200">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Quran Audio Player
          </CardTitle>
          <p className="text-center mt-4 text-gray-600">
            بسم الله الرحمن الرحيم، يمكنك هنا اختيار السورة والآية التي تريد
            الاستماع إليها. إذا كنت ترغب في تحديد آية بناءً على تلاوتك، اضغط على
            زر "تسجيل الآية"، وابدأ بالتلاوة. سيتعرف النظام على الآية ويعرض لك
            التفسير إذا كان متاحًا.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Select value={selectedSurah} onValueChange={handleSurahChange}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر سورة" />
                </SelectTrigger>
                <SelectContent>
                  {surahs.length > 0 ? (
                    surahs.map((surah) => (
                      <SelectItem key={surah.id} value={surah.id}>
                        {surah.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem key="no-surahs" value="no-surahs" disabled>
                      لا توجد سور متاحة
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            {selectedSurah && ayahs.length > 0 && (
              <div className="flex-1">
                <Select value={selectedAyah} onValueChange={handleAyahChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر آية" />
                  </SelectTrigger>
                  <SelectContent>
                    {ayahs.map((ayah) => (
                      <SelectItem key={ayah.verse_key} value={ayah.verse_key}>
                        {ayah.verse_key} - {ayah.text_indopak}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="flex justify-center">
            <Tooltip message="يجب عليك اختيار سورة لتتمكن من التسجيل.">
              <button
                onClick={handleVoiceRecording}
                className={`flex items-center gap-2 bg-gray-950 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105 ${
                  isRecording || !selectedSurah ? "cursor-not-allowed" : ""
                }`}
                disabled={isRecording || !selectedSurah}
              >
                {isRecording ? (
                  <>
                    <FaSpinner className="w-5 h-5 animate-spin" /> جارٍ
                    التسجيل...
                  </>
                ) : (
                  <>
                    <FaMicrophone className="w-5 h-5" />
                    تسجيل الآية
                  </>
                )}
              </button>
            </Tooltip>
          </div>
          {selectedSurah && selectedAyah && (
            <div className="text-center mt-4 text-gray-800">
              <h4 className="text-lg font-semibold">
                سورة {surahs.find((s) => s.id === selectedSurah)?.name} - آية{" "}
                {selectedAyah}
              </h4>
            </div>
          )}
          {selectedAyahText && (
            <div className="mt-4 p-4 border rounded-md bg-gray-50 text-right">
              <h3 className="text-lg font-semibold">نص الآية:</h3>
              <p>{selectedAyahText}</p>
            </div>
          )}
          {audioUrl && (
            <audio controls src={audioUrl} ref={audioRef} className="w-full" />
          )}
          {tafseerText && (
            <div className="mt-4 p-4 border rounded-md bg-gray-50 text-right">
              <h3 className="text-lg font-semibold">التفسير:</h3>
              <p>{tafseerText}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
