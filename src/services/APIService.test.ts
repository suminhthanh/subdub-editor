import { extractFilenameFromContentDisposition } from "./APIService";

describe("extractFilenameFromContentDisposition", () => {
  it("should extract filename from content-disposition header", () => {
    const contentDisposition =
      "attachment; filename=\"El Soldadet de Plom-lFSzQ2G9EsI.mp3\"; filename*=UTF-8''El%20Soldadet%20de%20Plom-lFSzQ2G9EsI.mp3";
    const result = extractFilenameFromContentDisposition(contentDisposition);
    expect(result).toBe("El Soldadet de Plom-lFSzQ2G9EsI.mp3");
  });

  it('should return "input" if content-disposition is null', () => {
    const result = extractFilenameFromContentDisposition(null);
    expect(result).toBe("input");
  });

  it('should return "input" if filename is not found in content-disposition', () => {
    const contentDisposition = "attachment; invalid-format";
    const result = extractFilenameFromContentDisposition(contentDisposition);
    expect(result).toBe("input");
  });

  it("should handle filename without quotes", () => {
    const contentDisposition = "attachment; filename=test.mp4";
    const result = extractFilenameFromContentDisposition(contentDisposition);
    expect(result).toBe("test.mp4");
  });

  it("should handle filename with spaces", () => {
    const contentDisposition = 'attachment; filename="test file.mp4"';
    const result = extractFilenameFromContentDisposition(contentDisposition);
    expect(result).toBe("test file.mp4");
  });
});
