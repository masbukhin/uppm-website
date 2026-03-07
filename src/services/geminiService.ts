import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function suggestTitleImprovement(judul: string, abstrak: string): Promise<string> {
  const prompt = `Anda adalah "Asisten Digital UPPM Politeknik Sinarmas Berau Coal".
Seorang dosen memberikan judul penelitian/pengabdian berikut: "${judul}"
Dan abstrak: "${abstrak}"

Tugas Anda:
Jika judul tersebut tidak lengkap atau kurang akademis, berikan saran perbaikan agar sesuai dengan standar akademik.
Berikan respons dalam bahasa Indonesia yang formal, profesional, dan mendukung.
Hanya berikan saran judul dan penjelasan singkat mengapa judul tersebut lebih baik.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text || "Tidak ada saran yang dapat diberikan saat ini.";
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return "Maaf, terjadi kesalahan saat menghubungi asisten AI.";
  }
}

export async function formatPublication(data: any): Promise<string> {
  const prompt = `Anda adalah "Asisten Digital UPPM Politeknik Sinarmas Berau Coal".
Bantu dosen memformat data publikasi berikut untuk persiapan input ke SINTA.
Data:
Judul: ${data.judul}
Penulis: ${data.penulis}
Jenis: ${data.jenis}
Nama Jurnal/Prosiding: ${data.namaJurnal}
Tahun: ${data.tahun}
Volume: ${data.volume}
Nomor: ${data.nomor}
Halaman: ${data.halaman}
URL: ${data.url}

Tugas Anda:
Buat format sitasi standar (misal: APA atau IEEE) yang rapi, dan berikan panduan singkat apa saja yang perlu disiapkan dosen saat menginput data ini ke SINTA.
Gunakan bahasa Indonesia yang formal, profesional, dan mendukung.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text || "Tidak dapat memformat publikasi saat ini.";
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return "Maaf, terjadi kesalahan saat menghubungi asisten AI.";
  }
}
