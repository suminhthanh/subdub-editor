import { v4 as uuidv4 } from "uuid";

export interface Speaker {
  id: string;
  name: string;
  voice: string;
  color: string;
}

const getRandomColor = () => {
  return (
    "#" +
    Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, "0")
  );
};

class SpeakerService {
  private speakers: Speaker[] = [];

  setSpeakers(speakersData: Partial<Speaker>[]): void {
    this.speakers = speakersData.map((speaker) => ({
      id: speaker.id || uuidv4(),
      name: speaker.name || "",
      voice: speaker.voice || "default",
      color: speaker.color || getRandomColor(),
    }));
  }

  getSpeakers(): Speaker[] {
    return this.speakers;
  }

  addSpeaker(name: string, voice: string = "default"): void {
    this.speakers.push({
      id: uuidv4(),
      name,
      voice,
      color: getRandomColor(),
    });
  }

  updateSpeaker(id: string, updates: Partial<Speaker>): void {
    const index = this.speakers.findIndex((speaker) => speaker.id === id);
    if (index !== -1) {
      this.speakers[index] = { ...this.speakers[index], ...updates };
    }
  }

  getSpeakerById(id: string): Speaker | undefined {
    return this.speakers.find((speaker) => speaker.id === id);
  }
}

export const speakerService = new SpeakerService();
