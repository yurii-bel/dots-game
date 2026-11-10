import { RequireNickname } from "@/components/auth/RequireNickname";
import { Lobby } from "@/components/game/Lobby";

export default function LobbyPage() {
  return (
    <RequireNickname>
      <Lobby />
    </RequireNickname>
  );
}
