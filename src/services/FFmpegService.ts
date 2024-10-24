import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg";
import { v4 as uuidv4 } from "uuid";
import { Track } from "../types/Track";

const ffmpeg = createFFmpeg({ log: true });

export interface Subtitle {
  id: string;
  startTime: number;
  duration: number;
  text: string;
}

export const extractTracks = async (mediaFile: File): Promise<Track[]> => {
  if (!ffmpeg.isLoaded()) {
    await ffmpeg.load();
  }

  ffmpeg.FS("writeFile", mediaFile.name, await fetchFile(mediaFile));

  await ffmpeg.run("-i", mediaFile.name, "-map", "0:s:0", "subtitles.srt");

  try {
    const data = ffmpeg.FS("readFile", "subtitles.srt");
    const subtitles = new TextDecoder().decode(data);

    return parseSRT(subtitles);
  } catch (error) {
    console.error("Error extracting tracks:", error);
    return [];
  }
};

export const rebuildMedia = async (
  mediaFile: File,
  tracks: Track[]
): Promise<Blob> => {
  if (!ffmpeg.isLoaded()) {
    await ffmpeg.load();
  }

  const inputFileName = mediaFile.name;
  const outputFileName = `output_${inputFileName}`;

  ffmpeg.FS("writeFile", inputFileName, await fetchFile(mediaFile));
  ffmpeg.FS("writeFile", "subtitles.srt", generateSRT(tracks));

  const isAudio = mediaFile.type.startsWith("audio");

  const ffmpegArgs = [
    "-i",
    inputFileName,
    "-i",
    "subtitles.srt",
    "-c",
    "copy",
    "-c:s",
    "mov_text",
    "-map",
    "0",
    "-map",
    "1",
  ];

  if (isAudio) {
    ffmpegArgs.splice(6, 2); // Remove "-map", "0" for audio files
  }

  ffmpegArgs.push(outputFileName);

  await ffmpeg.run(...ffmpegArgs);

  const data = ffmpeg.FS("readFile", outputFileName);
  return new Blob([data.buffer], { type: mediaFile.type });
};

const parseSRT = (srtContent: string): Track[] => {
  const tracks: Track[] = [];
  const subtitleBlocks = srtContent.trim().split("\n\n");

  subtitleBlocks.forEach((block) => {
    const lines = block.split("\n");
    if (lines.length >= 3) {
      const timeCode = lines[1].split(" --> ");
      const start = timeStringToSeconds(timeCode[0]);
      const end = timeStringToSeconds(timeCode[1]);
      const text = lines.slice(2).join("\n");

      tracks.push({
        id: uuidv4(),
        start,
        end,
        speaker_id: "",
        path: "",
        text,
        for_dubbing: false,
        ssml_gender: "",
        translated_text: "",
        assigned_voice: "",
        pitch: 0,
        speed: 1,
        volume_gain_db: 0,
      });
    }
  });

  return tracks;
};

const generateSRT = (tracks: Track[]): string => {
  return tracks
    .map((track, index) => {
      const startTime = secondsToTimeString(track.start);
      const endTime = secondsToTimeString(track.end);
      return `${index + 1}\n${startTime} --> ${endTime}\n${track.text}`;
    })
    .join("\n\n");
};

const timeStringToSeconds = (timeString: string): number => {
  const [hours, minutes, seconds] = timeString.split(":").map(parseFloat);
  return hours * 3600 + minutes * 60 + seconds;
};

const secondsToTimeString = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = (totalSeconds % 60).toFixed(3);
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.padStart(6, "0")}`;
};

export const mergeMediaWithFFmpeg = async (
  videoUrl: string,
  audioUrls: string[]
): Promise<Blob> => {
  if (!ffmpeg.isLoaded()) {
    await ffmpeg.load();
  }

  const videoData = await fetchFile(videoUrl);
  ffmpeg.FS("writeFile", "video.mp4", videoData);

  for (let i = 0; i < audioUrls.length; i++) {
    const audioData = await fetchFile(audioUrls[i]);
    ffmpeg.FS("writeFile", `audio${i}.mp3`, audioData);
  }

  const outputFileName = "output.mp4";

  // Construct the FFmpeg command
  const ffmpegArgs = [
    "-i",
    "video.mp4",
    ...audioUrls.map((_, i) => ["-i", `audio${i}.mp3`]).flat(),
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-map",
    "0:v",
    ...audioUrls.map((_, i) => ["-map", `${i + 1}:a`]).flat(),
    outputFileName,
  ];

  await ffmpeg.run(...ffmpegArgs);

  const data = ffmpeg.FS("readFile", outputFileName);
  return new Blob([data.buffer], { type: "video/mp4" });
};
