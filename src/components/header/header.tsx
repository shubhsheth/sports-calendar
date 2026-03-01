import { Link } from "@tanstack/react-router";

function Header() {
  return (
    <header className="bg-gray-800 text-white p-4">
      <div className="max-w-3xl mx-auto grid grid-cols-2">
        <h1 className="text-2xl font-bold">
          <Link to="/">Sports Cal</Link>
        </h1>
      </div>
    </header>
  );
}

export default Header;
