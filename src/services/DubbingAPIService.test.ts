import { DubbingAPIService } from "./DubbingAPIService";

describe("DubbingAPIService", () => {
  describe("parseTracksFromJSON", () => {
    it("should parse valid dubbing JSON data", () => {
      const mockData = [
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
      ];

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
    });

    it("should handle missing properties", () => {
      const mockData = [
        {
          id: "1",
          start: 0,
          end: 5,
        },
      ];

      const result = DubbingAPIService.parseTracksFromJSON(mockData);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: "1",
          start: 0,
          end: 5,
          speaker_id: "",
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
    });

    it("should throw an error for invalid input", () => {
      const mockData = { invalid: "data" };

      expect(() => DubbingAPIService.parseTracksFromJSON(mockData)).toThrow(
        "Invalid dubbing data format"
      );
    });
  });

  // You might want to add more tests for loadVideoFromUUID and loadTracksFromUUID
  // However, these functions make API calls, so you'd need to mock the fetch function
  // Here's an example of how you might structure those tests:

  describe("loadVideoFromUUID", () => {
    it("should load video data correctly", async () => {
      // Mock the fetch function
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              url: "test-url",
              contentType: "video/mp4",
              filename: "test.mp4",
            }),
        })
      ) as jest.Mock;

      const result = await DubbingAPIService.loadVideoFromUUID("test-uuid");

      expect(result).toEqual({
        url: "test-url",
        contentType: "video/mp4",
        filename: "test.mp4",
      });
    });

    // Add more tests for error cases
  });

  describe("loadTracksFromUUID", () => {
    it("should load tracks data correctly", async () => {
      // Mock the fetch function
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ id: "1", start: 0, end: 5 }]),
        })
      ) as jest.Mock;

      const result = await DubbingAPIService.loadTracksFromUUID("test-uuid");

      expect(result).toEqual([{ id: "1", start: 0, end: 5 }]);
    });

    // Add more tests for error cases
  });
});
