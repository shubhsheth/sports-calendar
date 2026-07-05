import { Link } from "@tanstack/react-router";
import { AuthMenu } from "@/components/auth/auth-menu";

function Header() {
  return (
    <header className="bg-gray-800 text-white p-4">
      <div className="max-w-3xl mx-auto grid grid-cols-2 items-center">
        <h1 className="text-2xl font-bold">
          <Link to="/">Sports Cal</Link>
        </h1>
        <AuthMenu />
      </div>
    </header>
  );
}

export default Header;
