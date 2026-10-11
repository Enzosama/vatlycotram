export type VideoSourceType = 'youtube' | 'googledrive' | 'notebooklm' | 'direct';

export interface ParsedVideoSource {
  type: VideoSourceType;
  embedUrl: string;
  originalUrl: string;
  videoId?: string;
  displayName: string;
}

/**
 * Trích xuất và phân tích nguồn video từ URL:
 * Hỗ trợ YouTube, Google Drive và Direct MP4/WebM
 */
export function parseVideoSource(rawUrl: string): ParsedVideoSource {
  if (!rawUrl) {
    return {
      type: 'direct',
      embedUrl: '',
      originalUrl: '',
      displayName: 'Không có video',
    };
  }

  const url = rawUrl.trim();

  // 1. YouTube detection
  // Hỗ trợ watch?v=, youtu.be/, embed/, shorts/
  const ytMatch = url.match(
    /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );

  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    return {
      type: 'youtube',
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`,
      originalUrl: url,
      videoId,
      displayName: 'YouTube Video',
    };
  }

  // 2. Google Drive detection
  // Hỗ trợ file/d/{id}/view, file/d/{id}/preview, open?id={id}, uc?id={id}
  const gDriveFileMatch = url.match(
    /(?:drive|docs)\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/
  );
  if (gDriveFileMatch && gDriveFileMatch[1]) {
    const fileId = gDriveFileMatch[1];
    return {
      type: 'googledrive',
      embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
      originalUrl: url,
      videoId: fileId,
      displayName: 'Google Drive Video',
    };
  }

  const gDriveIdMatch = url.match(
    /drive\.google\.com\/(?:open|uc)\?(?:.*&)?id=([a-zA-Z0-9_-]+)/
  );
  if (gDriveIdMatch && gDriveIdMatch[1]) {
    const fileId = gDriveIdMatch[1];
    return {
      type: 'googledrive',
      embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
      originalUrl: url,
      videoId: fileId,
      displayName: 'Google Drive Video',
    };
  }

  // 3. NotebookLM Artifact detection
  if (url.includes('notebook.google.com')) {
    return {
      type: 'notebooklm',
      embedUrl: url,
      originalUrl: url,
      displayName: 'Google NotebookLM',
    };
  }

  // 4. Direct video (MP4, WebM, vv)
  return {
    type: 'direct',
    embedUrl: url,
    originalUrl: url,
    displayName: 'Video MP4 / Trực tiếp',
  };
}

const CUSTOM_VIDEO_STORAGE_KEY = 'tqt_custom_lesson_videos_v1';

export function getCustomLessonVideos(): Record<string, string> {
  try {
    const raw = localStorage.getItem(CUSTOM_VIDEO_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return {};
}

export function saveCustomLessonVideo(lessonId: string, videoUrl: string): void {
  try {
    const current = getCustomLessonVideos();
    if (videoUrl.trim()) {
      current[lessonId] = videoUrl.trim();
    } else {
      delete current[lessonId];
    }
    localStorage.setItem(CUSTOM_VIDEO_STORAGE_KEY, JSON.stringify(current));
  } catch (e) {
    console.error(e);
  }
}
