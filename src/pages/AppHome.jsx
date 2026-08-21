export default function AppHome({ section }) {
  const source = section ? `/app-home.html#${section}` : '/app-home.html';
  return (
    <iframe
      src={source}
      title="DB's Workouts AI coaching"
      className="block w-full h-screen border-0 bg-[#0b0b0d]"
    />
  );
}
