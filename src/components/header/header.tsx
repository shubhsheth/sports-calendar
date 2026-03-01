import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { Github } from "lucide-react";

function Header() {
  return (
    <header className="bg-gray-800 text-white p-4">
      <div className="max-w-3xl mx-auto grid grid-cols-2">
        <h1 className="text-2xl font-bold">
          <Link to="/">Sports Cal</Link>
        </h1>
        <div className="flex flex-row gap-2 justify-end">
          <Button variant="ghost" size="icon-lg">
            <a
              href="https://github.com/shubhsheth/sports-calendar"
              target="_blank"
            >
              <Github />
            </a>
          </Button>
        </div>
      </div>
    </header>
  );
}

export default Header;
