import { Link } from "react-router-dom";
import logolight from "@/assets/logolight.png";
import logodark from "@/assets/logodark.png";
import { Facebook, Twitter, Linkedin, Instagram, Youtube, Mail } from "lucide-react";

const footerLinks = {
  product: [
    { label: "Features", path: "/learn-more" },
    { label: "How It Works", path: "/learn-more" },
    { label: "Pricing", path: "/#pricing" },
    { label: "For Schools", path: "/login/teacher" },
  ],
  company: [
    { label: "About Us", path: "/about" },
    { label: "Careers", path: "/careers" },
    { label: "Partnerships", path: "/partnerships" },
    { label: "Press & Media", path: "/press" },
  ],
  resources: [
    { label: "Why It Matters", path: "/why-it-matters" },
    { label: "Research", path: "/research" },
    { label: "Blog", path: "/blog" },
    { label: "FAQ", path: "/faq" },
  ],
  legal: [
    { label: "Privacy Policy", path: "/privacy" },
    { label: "Terms of Service", path: "/terms" },
    { label: "Cookie Policy", path: "/cookies" },
    { label: "Accessibility", path: "/accessibility" },
  ],
};

const socialLinks = [
  { icon: Facebook, href: "#", label: "Facebook" },
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Linkedin, href: "#", label: "LinkedIn" },
  { icon: Instagram, href: "#", label: "Instagram" },
  { icon: Youtube, href: "#", label: "YouTube" },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-6">
          {/* Brand */}
           <div className="lg:col-span-2">
           {/* Light mode logo */}
          <img
             src={logolight}
             alt="SWARSETU Logo"
             className="h-16 w-auto block dark:hidden"
          />

          {/* Dark mode logo */}
         <img
             src={logodark}
             alt="SWARSETU Logo Dark"
             className="h-16 w-auto hidden dark:block"
          />
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-xs">
              AI-powered early detection of learning disabilities for every Indian child. 
              Multilingual, voice-first, and accessible.
            </p>
            <div className="mt-6 flex gap-4">
              {socialLinks.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  <Icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Product</h3>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.path}
                    className="text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-4">Company</h3>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.path}
                    className="text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-4">Resources</h3>
            <ul className="space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.path}
                    className="text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-4">Legal</h3>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.path}
                    className="text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} SWARSETU. All rights reserved.
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4" />
            <a href="mailto:contact@swarsetu.in" className="hover:text-primary transition-colors">
              contact@swarsetu.in
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
