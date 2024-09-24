import axios from "axios";

export async function GET(request, { params }) {
  const { tafseer_id, surah } = params;
  const { searchParams } = new URL(request.url);
  const ayah = searchParams.get("ayah");

  const tafsirUrl = `http://api.quran-tafseer.com/tafseer/${tafseer_id}/${surah}/${ayah}/${ayah}`;

  try {
    const response = await axios.get(tafsirUrl);
    return new Response(JSON.stringify(response.data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error fetching tafseer:", error);
    return new Response("Error fetching tafseer", { status: 500 });
  }
}
