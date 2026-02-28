import { Link } from "react-router-dom";

export default function PublicFooter() {
  return (
    <footer className="bg-background-dark border-t border-white/5 pt-16 pb-8 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12 mb-16">
          {/* Brand */}
          <div className="col-span-2">
            <Link to="/" className="flex items-center gap-3 mb-6">
              <div className="bg-primary p-2 rounded-lg">
                <span className="material-symbols-outlined text-white text-xl">
                  fingerprint
                </span>
              </div>
              <span className="text-lg font-bold tracking-tight text-white uppercase">
                Polka<span className="text-primary">Me</span>
              </span>
            </Link>
            <p className="text-slate-500 max-w-xs mb-8">
              The universal identity layer for the Polkadot multichain future.
              Secure, privacy-preserving, and user-owned.
            </p>
            <div className="flex gap-4">
              {["share", "terminal", "hub"].map((icon) => (
                <a
                  key={icon}
                  href="#"
                  className="h-10 w-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
                >
                  <span className="material-symbols-outlined text-slate-300 text-sm">
                    {icon}
                  </span>
                </a>
              ))}
            </div>
          </div>

          {/* Columns */}
          <FooterColumn
            title="Platform"
            links={["Features", "XCM Bridge", "Staking", "Security"]}
          />
          <FooterColumn
            title="Resources"
            links={["Documentation", "API Reference", "Brand Assets", "GitHub"]}
          />
          <FooterColumn
            title="Company"
            links={["About Us", "Careers", "Privacy Policy", "Terms"]}
          />
        </div>

        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-600 text-xs">
            © 2026 PolkaMe Foundation. Built with Substrate.
          </p>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2 text-slate-600 text-xs">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              All systems operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: string[];
}) {
  return (
    <div>
      <h5 className="text-white font-bold mb-6">{title}</h5>
      <ul className="flex flex-col gap-4">
        {links.map((l) => (
          <li key={l}>
            <a
              href="#"
              className="text-slate-500 hover:text-primary transition-colors text-sm"
            >
              {l}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
