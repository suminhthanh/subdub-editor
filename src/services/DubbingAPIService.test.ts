import { DubbingAPIService, DubbingJSON } from "./DubbingAPIService";
import { speakerService } from "./SpeakerService";
import { matxaSynthesisProvider } from "./MatxaSynthesisProvider";

// Mock the SpeakerService
jest.mock("./SpeakerService", () => ({
  speakerService: {
    setSpeaker: jest.fn(),
  },
}));

// Mock the MatxaSynthesisProvider
jest.mock("./MatxaSynthesisProvider", () => ({
  matxaSynthesisProvider: {
    getVoice: jest.fn().mockReturnValue("mockedVoice"),
  },
}));

// Mock the react-i18next
jest.mock("react-i18next", () => ({
  getI18n: () => ({
    t: jest.fn().mockReturnValue("Speaker"),
  }),
}));

describe("DubbingAPIService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("parseTracksFromJSON", () => {
    it("should parse valid dubbing JSON data", () => {
      const mockData: DubbingJSON[] = [
        {
          id: 1,
          start: 0,
          end: 5,
          speaker_id: "SPEAKER_01",
          path: "path/to/audio.mp3",
          text: "Hello, world!",
          for_dubbing: true,
          gender: "Female",
          translated_text: "Hola, mundo!",
          assigned_voice: "voice1",
          pitch: 0,
          speed: 1,
          volume_gain_db: 0,
          dubbed_path: "path/to/dubbed/audio.mp3",
        },
      ];

      const result = DubbingAPIService.parseTracksFromJSON(mockData);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 1,
        start: 0,
        end: 5,
        speaker_id: "SPEAKER_01",
        path: "path/to/audio.mp3",
        text: "Hello, world!",
        original_text: "Hello, world!",
        original_translated_text: "Hola, mundo!",
        for_dubbing: true,
        ssml_gender: "Female",
        translated_text: "Hola, mundo!",
        pitch: 0,
        speed: 1,
        volume_gain_db: 0,
        dubbed_path: "path/to/dubbed/audio.mp3",
        chunk_size: 0,
        needsResynthesis: false,
      });
      expect(speakerService.setSpeaker).toHaveBeenCalledWith({
        id: "SPEAKER_01",
        name: "Speaker 01",
        voice: "mockedVoice",
      });
    });

    it("should handle missing properties", () => {
      const mockData = [
        {
          id: "1",
          start: 0,
          end: 5,
          speaker_id: "SPEAKER_01",
        },
      ];

      const result = DubbingAPIService.parseTracksFromJSON(mockData);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          start: 0,
          end: 5,
          speaker_id: "SPEAKER_01",
          path: "",
          text: "",
          for_dubbing: false,
          ssml_gender: "",
          translated_text: "",
          pitch: 0,
          speed: 1,
          volume_gain_db: 0,
          needsResynthesis: false,
        })
      );
      expect(speakerService.setSpeaker).toHaveBeenCalledWith({
        id: "SPEAKER_01",
        name: "Speaker 01",
        voice: "mockedVoice",
      });
    });

    it("should throw an error for invalid input", () => {
      const mockData = { invalid: "data" };

      expect(() =>
        DubbingAPIService.parseTracksFromJSON(mockData as any)
      ).toThrow("utterances is not iterable");
    });
  });

  describe("loadTracksFromUUID", () => {
    it("should load tracks data correctly", async () => {
      const mockData = {
        utterances: [{ id: "1", start: 0, end: 5 }],
        source_language: "en",
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockData),
      });

      const result = await DubbingAPIService.loadTracksFromUUID("test-uuid");

      expect(result).toEqual(mockData);
    });

    // Add more tests for error cases
  });
});
