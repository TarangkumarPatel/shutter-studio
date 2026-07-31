import type { Comment, Message, Photo } from "@/generated/prisma";

/** JSON-safe photo shape sent to the client (Date -> ISO string). */
export interface PhotoDTO {
  id: string;
  title: string | null;
  description: string | null;
  storageKey: string;
  originalKey: string;
  width: number;
  height: number;
  blurDataUrl: string;
  likeCount: number;
  commentCount: number;
  order: number;
  pinned: boolean;
  createdAt: string;
  isNew: boolean;
}

export interface CommentDTO {
  id: string;
  name: string;
  text: string;
  createdAt: string;
}

export interface MessageDTO {
  id: string;
  name: string;
  email: string;
  message: string;
  createdAt: string;
}

export function toPhotoDTO(
  photo: Photo & { commentCount?: number },
  isNew: boolean,
): PhotoDTO {
  return {
    id: photo.id,
    title: photo.title,
    description: photo.description,
    storageKey: photo.storageKey,
    originalKey: photo.originalKey,
    width: photo.width,
    height: photo.height,
    blurDataUrl: photo.blurDataUrl,
    likeCount: photo.likeCount,
    commentCount: photo.commentCount ?? 0,
    order: photo.order,
    pinned: photo.pinned,
    createdAt: photo.createdAt.toISOString(),
    isNew,
  };
}

export function toCommentDTO(comment: Comment): CommentDTO {
  return {
    id: comment.id,
    name: comment.name,
    text: comment.text,
    createdAt: comment.createdAt.toISOString(),
  };
}

export function toMessageDTO(message: Message): MessageDTO {
  return {
    id: message.id,
    name: message.name,
    email: message.email,
    message: message.message,
    createdAt: message.createdAt.toISOString(),
  };
}

export type GameMode = "portfolio-vs-portfolio" | "challenge";

export interface GameJudgeRequest {
  mode: GameMode;
  photoAId: string;
  photoBId?: string;
  challengeImageBase64?: string;
  challengeImageMediaType?: string;
}

export interface GameJudgeResponse {
  photoA: { score: number; critique: string };
  photoB: { score: number; critique: string };
  winner: "A" | "B" | "tie";
  verdict: string;
}
