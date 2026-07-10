import axios from "axios";
import { BACKEND_URL } from "../../config";
import { ChatRoom } from "../../../components/ChatRoom";

async function getRoomId(slug: string) {
    const response = await axios.post(`${BACKEND_URL}/api/v1/room/${slug}`);
    return response.data.room?.id;
}

export default async function ChatRoom1({
    params
}: {
    params: {
        slug: string
    }
}) {
    const slug = (await params).slug;
    const roomId = await getRoomId(slug);

    if (!roomId) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-white font-sans p-4">
                <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-3xl p-8 text-center shadow-2xl">
                    <div className="p-3 bg-red-600/10 border border-red-500/20 rounded-2xl w-12 h-12 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-extrabold text-white mb-2">Room Not Found</h2>
                    <p className="text-neutral-400 text-xs mb-6 leading-relaxed">
                        The room with slug <span className="text-white font-semibold">"{slug}"</span> could not be found. Please double-check the ID or create a new room.
                    </p>
                    <a href="/" className="inline-block py-2.5 px-6 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-full text-xs transition-all shadow-lg active:scale-95">
                        Back to Dashboard
                    </a>
                </div>
            </div>
        );
    }

    return <ChatRoom id={roomId}></ChatRoom>
}