import { Voice } from "../types/Voice";
import { SynthesisProvider } from "./SynthesisService";

interface MatxaVoice extends Voice {
  gender: string;
  language: string;
  region: string;
  name: string;
}

const API_BASE_URL =
  process.env.MATXA_API_BASE_URL ||
  "https://api.softcatala.org/dubbing-service/v1";

class MatxaSynthesisProvider implements SynthesisProvider {
  private providerName = "matxa";
  private voiceList: MatxaVoice[] = [
    {
      name: "quim-balear",
      id: "0",
      gender: "male",
      language: "cat",
      region: "balear",
      label: "Home - Balear (Quim)",
      provider: this.providerName,
    },
    {
      name: "olga-balear",
      id: "1",
      gender: "female",
      language: "cat",
      region: "balear",
      label: "Dona - Balear (Olga)",
      provider: this.providerName,
    },
    {
      name: "grau-central",
      id: "2",
      gender: "male",
      language: "cat",
      region: "central",
      label: "Dona - Central (Grau)",
      provider: this.providerName,
    },
    {
      name: "elia-central",
      id: "3",
      gender: "female",
      language: "cat",
      region: "central",
      label: "Dona - Central (Èlia)",
      provider: this.providerName,
    },
    {
      name: "pere-nord",
      id: "4",
      gender: "male",
      language: "cat",
      region: "nord",
      label: "Home - Nord-occidental (Pere)",
      provider: this.providerName,
    },
    {
      name: "emma-nord",
      id: "5",
      gender: "female",
      language: "cat",
      region: "nord",
      label: "Dona - Nord-occidental (Emma)",
      provider: this.providerName,
    },
    {
      name: "lluc-valencia",
      id: "6",
      gender: "male",
      language: "cat",
      region: "valencia",
      label: "Home - Valencià (Lluc)",
      provider: this.providerName,
    },
    {
      name: "gina-valencia",
      id: "7",
      gender: "female",
      language: "cat",
      region: "valencia",
      label: "Dona - Valencià (Gina)",
      provider: this.providerName,
    },
  ];

  async voices(): Promise<Voice[]> {
    return this.voiceList;
  }

  async speak(text: string, voice: Voice): Promise<ArrayBuffer> {
    const url = `${API_BASE_URL}/speak/?text=${encodeURIComponent(
      text
    )}&voice=${voice.id}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.arrayBuffer();
    } catch (error) {
      console.error("Error generating speech:", error);
      throw error;
    }
  }

  getVoice(id: string): Voice {
    return this.voiceList.find((voice) => voice.id === id) || this.voiceList[0];
  }

  getProviderName(): string {
    return this.providerName;
  }
}

export const matxaSynthesisProvider = new MatxaSynthesisProvider();
