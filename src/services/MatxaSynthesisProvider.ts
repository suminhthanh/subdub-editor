import { Voice } from "../types/Voice";
import { SynthesisProvider } from "./SynthesisService";

interface MatxaVoice extends Voice {
  gender: string;
  language: string;
  region: string;
  name: string;
}

export class MatxaSynthesisProvider implements SynthesisProvider {
  static providerName = "matxa";
  private voiceList: MatxaVoice[] = [
    {
      name: "quim-balear",
      id: "0",
      gender: "male",
      language: "cat",
      region: "balear",
      label: "Quim (Balear)",
      provider: MatxaSynthesisProvider.name,
    },
    {
      name: "olga-balear",
      id: "1",
      gender: "female",
      language: "cat",
      region: "balear",
      label: "Olga (Balear)",
      provider: MatxaSynthesisProvider.providerName,
    },
    {
      name: "grau-central",
      id: "2",
      gender: "male",
      language: "cat",
      region: "central",
      label: "Grau (Central)",
      provider: MatxaSynthesisProvider.providerName,
    },
    {
      name: "elia-central",
      id: "3",
      gender: "female",
      language: "cat",
      region: "central",
      label: "Elia (Central)",
      provider: MatxaSynthesisProvider.providerName,
    },
    {
      name: "pere-nord",
      id: "4",
      gender: "male",
      language: "cat",
      region: "nord",
      label: "Pere (Nord)",
      provider: MatxaSynthesisProvider.providerName,
    },
    {
      name: "emma-nord",
      id: "5",
      gender: "female",
      language: "cat",
      region: "nord",
      label: "Emma (Nord)",
      provider: MatxaSynthesisProvider.providerName,
    },
    {
      name: "lluc-valencia",
      id: "6",
      gender: "male",
      language: "cat",
      region: "valencia",
      label: "Lluc (València)",
      provider: MatxaSynthesisProvider.providerName,
    },
    {
      name: "gina-valencia",
      id: "7",
      gender: "female",
      language: "cat",
      region: "valencia",
      label: "Gina (València)",
      provider: MatxaSynthesisProvider.providerName,
    },
  ];

  async voices(): Promise<Voice[]> {
    return this.voiceList;
  }

  async speak(text: string, voice: Voice): Promise<AudioBuffer> {
    const url = `https://api.softcatala.org/dubbing-service/v1/speak/?text=${encodeURIComponent(
      text
    )}&voice=${voice.id}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const audioContext = new window.AudioContext();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      return audioBuffer;
    } catch (error) {
      console.error("Error generating speech:", error);
      throw error;
    }
  }
}
