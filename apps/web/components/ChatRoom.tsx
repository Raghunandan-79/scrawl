import { ChatRoomClient } from "./ChatRoomClient";

export function ChatRoom({ id }: { id: string }) {
    return <ChatRoomClient id={id} />
}
