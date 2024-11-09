import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg";
import { v4 as uuidv4 } from "uuid";
import { Track } from "../types/Track";
import { encodeWAV } from "../utils/audioUtils"; // Make sure to implement this function
import { matxaSynthesisProvider } from "./MatxaSynthesisProvider";
import { speakerService } from "./SpeakerService";

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
  mediaFile: File | string,
  tracks: Track[],
  selectedAudioTracks: { buffer: ArrayBuffer | AudioBuffer; label: string }[],
  selectedSubtitles: string[]
): Promise<Blob> => {
  if (!ffmpeg.isLoaded()) {
    await ffmpeg.load();
  }

  const inputFileName = "input.mp4";
  const outputFileName = `output.mp4`;

  ffmpeg.FS("writeFile", inputFileName, await fetchFile(mediaFile));

  // Write subtitle files
  if (selectedSubtitles.includes("original")) {
    const originalSubtitles = generateSRT(tracks, false);
    ffmpeg.FS("writeFile", "original_subtitles.srt", originalSubtitles);
  }
  if (selectedSubtitles.includes("dubbed")) {
    const dubbedSubtitles = generateSRT(tracks, true);
    ffmpeg.FS("writeFile", "dubbed_subtitles.srt", dubbedSubtitles);
  }

  const ffmpegArgs = ["-i", inputFileName];

  if (selectedSubtitles.includes("original")) {
    ffmpegArgs.push("-i", "original_subtitles.srt");
  }
  if (selectedSubtitles.includes("dubbed")) {
    ffmpegArgs.push("-i", "dubbed_subtitles.srt");
  }

  // Write audio files
  for (let i = 0; i < selectedAudioTracks.length; i++) {
    const audioBuffer = selectedAudioTracks[i].buffer;
    let audioData: Uint8Array;

    if (audioBuffer instanceof AudioBuffer) {
      audioData = encodeWAV(audioBuffer);
      ffmpeg.FS("writeFile", `audio_${i}.wav`, audioData);
      ffmpegArgs.push("-i", `audio_${i}.wav`);
    } else {
      audioData = new Uint8Array(audioBuffer);
      ffmpeg.FS("writeFile", `audio_${i}.mp3`, audioData);
      ffmpegArgs.push("-i", `audio_${i}.mp3`);
    }
  }

  ffmpegArgs.push(
    "-map",
    "0:v", // Map video from original file
    "-c:v",
    "copy" // Copy video codec
  );

  // Map selected audio tracks
  selectedAudioTracks.forEach((_, i) => {
    ffmpegArgs.push(
      "-map",
      `${i + 1 + selectedSubtitles.length}:a`,
      "-c:a",
      "aac"
    );
  });

  // Map selected subtitles
  let subtitleIndex = 0;
  if (selectedSubtitles.includes("original")) {
    ffmpegArgs.push("-map", `${1 + subtitleIndex}`, "-c:s", "mov_text");
    ffmpegArgs.push("-metadata:s:s:0", "language=es");
    subtitleIndex++;
  }
  if (selectedSubtitles.includes("dubbed")) {
    ffmpegArgs.push("-map", `${1 + subtitleIndex}`, "-c:s", "mov_text");
    ffmpegArgs.push("-metadata:s:s:1", "language=ca");
  }

  // Set audio track titles
  selectedAudioTracks.forEach((track, i) => {
    ffmpegArgs.push(`-metadata:s:a:${i}`, `title=${track.label}`);
  });

  ffmpegArgs.push(outputFileName);

  await ffmpeg.run(...ffmpegArgs);

  const data = ffmpeg.FS("readFile", outputFileName);
  return new Blob([data.buffer], { type: "video/mp4" });
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
        dubbed_path: "",
        chunk_size: 0,
        path: "",
        text,
        for_dubbing: false,
        ssml_gender: "",
        translated_text: "",
        pitch: 0,
        speed: 1,
        volume_gain_db: 0,
        needsResynthesis: false,
      });
    }
  });

  return tracks;
};

const generateSRT = (tracks: Track[], isDubbed: boolean): string => {
  return tracks
    .map((track, index) => {
      const startTime = secondsToTimeString(track.start);
      const endTime = secondsToTimeString(track.end);
      const text = isDubbed ? track.translated_text : track.text;
      return `${index + 1}\n${startTime} --> ${endTime}\n${text}`;
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
