import { DubbingAPIService } from "./DubbingAPIService";
import { speakerService } from "./SpeakerService";

// Mock the SpeakerService
jest.mock("./SpeakerService", () => ({
  speakerService: {
    setSpeakers: jest.fn(),
  },
}));

describe("DubbingAPIService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("parseTracksFromJSON", () => {
    it("should parse valid dubbing JSON data", () => {
      const mockData = {
        utterances: [
          {
            id: "1",
            start: 0,
            end: 5,
            speaker_id: "SPEAKER_01",
            path: "path/to/audio.mp3",
            text: "Hello, world!",
            for_dubbing: true,
            ssml_gender: "Female",
            translated_text: "Hola, mundo!",
            assigned_voice: "voice1",
            pitch: 0,
            speed: 1,
            volume_gain_db: 0,
            dubbed_path: "path/to/dubbed/audio.mp3",
            chunk_size: 150,
          },
        ],
        source_language: "en",
      };

      const result = DubbingAPIService.parseTracksFromJSON(mockData);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: "1",
          start: 0,
          end: 5,
          speaker_id: "SPEAKER_01",
          path: "path/to/audio.mp3",
          text: "Hello, world!",
          for_dubbing: true,
          ssml_gender: "Female",
          translated_text: "Hola, mundo!",
          assigned_voice: "voice1",
          pitch: 0,
          speed: 1,
          volume_gain_db: 0,
          dubbed_path: "path/to/dubbed/audio.mp3",
          chunk_size: 150,
        })
      );
      expect(speakerService.setSpeakers).toHaveBeenCalledWith([
        { id: "SPEAKER_01", name: "SPEAKER_01", voice: "voice1" },
      ]);
    });

    it("should handle missing properties", () => {
      const mockData = {
        utterances: [
          {
            id: "1",
            start: 0,
            end: 5,
            speaker_id: "SPEAKER_01",
          },
        ],
        source_language: "en",
      };

      const result = DubbingAPIService.parseTracksFromJSON(mockData);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: "1",
          start: 0,
          end: 5,
          speaker_id: "SPEAKER_01",
          path: "",
          text: "",
          for_dubbing: false,
          ssml_gender: "",
          translated_text: "",
          assigned_voice: "",
          pitch: 0,
          speed: 1,
          volume_gain_db: 0,
        })
      );
      expect(speakerService.setSpeakers).toHaveBeenCalledWith([
        { id: "SPEAKER_01", name: "SPEAKER_01", voice: "default" },
      ]);
    });

    it("should throw an error for invalid input", () => {
      const mockData = { invalid: "data" };

      expect(() =>
        DubbingAPIService.parseTracksFromJSON(mockData as any)
      ).toThrow("Cannot read properties of undefined (reading 'map')");
    });
  });

  // You might want to add more tests for loadVideoFromUUID and loadTracksFromUUID
  // However, these functions make API calls, so you'd need to mock the fetch function
  // Here's an example of how you might structure those tests:

  describe("loadVideoFromUUID", () => {
    it("should load video data correctly", async () => {
      const mockBlob = new Blob(["test"], { type: "video/mp4" });
      const mockResponse = {
        ok: true,
        blob: jest.fn().mockResolvedValue(mockBlob),
        headers: new Headers({
          "content-type": "video/mp4",
          "content-disposition": 'attachment; filename="test.mp4"',
        }),
      };

      global.fetch = jest.fn().mockResolvedValue(mockResponse);
      global.URL.createObjectURL = jest.fn().mockReturnValue("blob:test-url");

      const result = await DubbingAPIService.loadVideoFromUUID("test-uuid");

      expect(result).toEqual({
        url: "blob:test-url",
        contentType: "video/mp4",
        filename: "test.mp4",
      });
    });

    // Add more tests for error cases
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
