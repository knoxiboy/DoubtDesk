export default function RoomCodeInput({ onJoin }: { onJoin: (code: string) => void }) {
  return <div className="flex"><input id="room" placeholder="Enter Room Code" /><button onClick={() => onJoin((document.getElementById('room') as HTMLInputElement).value)}>Join</button></div>;
}