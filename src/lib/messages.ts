import { prisma } from "./prisma";
import { toMessageDTO, type MessageDTO } from "@/types";

export async function getMessages(): Promise<MessageDTO[]> {
  const messages = await prisma.message.findMany({ orderBy: { createdAt: "desc" } });
  return messages.map(toMessageDTO);
}
