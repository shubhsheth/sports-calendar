function Footer() {
  return (
    <footer className="bg-gray-100 py-8 text-gray-600 px-4">
      <div className="max-w-3xl mx-auto">
        <p>
          <a
            href="https://github.com/shubhsheth/sports-calendar"
            target="_blank"
            className="underline"
          >
            GitHub
          </a>
        </p>
        <p className="mt-6">
          Made with ❤️ by{" "}
          <a href="https://iamshubh.com" target="_blank" className="underline">
            Shubh Sheth
          </a>
        </p>
        <p className="text-sm mt-2 text-gray-500">
          © {new Date().getFullYear()} Sports Cal. All sports trademarks are
          copyright to respective owners.
        </p>
      </div>
    </footer>
  );
}

export default Footer;
