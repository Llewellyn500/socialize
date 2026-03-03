import React from "react";
import Link from "next/link";
import {
  FaYoutube,
  FaInstagram,
  FaGithub,
  FaGamepad,
  FaLinkedin,
  FaGlobe,
  FaPatreon,
  FaTiktok,
  FaEnvelope,
} from "react-icons/fa";
import { FaX, FaXTwitter } from "react-icons/fa6";
import ProfileImage from "../public/LAP-Logo.png";

export default function Home() {
  const sections = [
    {
      header: "My YouTube Channels",
      links: [
        {
          name: "LAP - Tutorials YouTube Channel",
          url: "https://www.youtube.com/@lap-tutorials",
          icon: <FaYoutube />,
        },
        {
          name: "Arclapain YouTube Channel",
          url: "https://www.youtube.com/@arclapain",
          icon: <FaYoutube />,
        },
      ],
    },
    {
      header: "My Socials",
      links: [
        {
          name: "LinkedIn",
          url: "https://www.linkedin.com/in/llewellynpaintsil/",
          icon: <FaLinkedin />,
        },
        {
          name: "My Instagram",
          url: "https://www.instagram.com/llewellynpaint/",
          icon: <FaInstagram />,
        },
        {
          name: "x.com",
          url: "https://x.com/LlewellynAdont1",
          icon: <FaXTwitter />,
        },
        {
          name: "GitHub",
          url: "https://github.com/Llewellyn500",
          icon: <FaGithub />,
        },
      ],
    },
    {
      header: "Other Links",
      links: [
        {
          name: "Portfolio",
          url: "http://llewellyn.is-a.dev/",
          icon: <FaGlobe />,
        },
        {
          name: "Games I’ve Played",
          url: "https://www.ign.com/playlist/Arclapain",
          icon: <FaGamepad />,
        },
      ],
    },
    {
      header: "LAP - Tutorials",
      links: [
        {
          name: "LAP Docs",
          url: "https://lap.onl",
          icon: (
            <img src={ProfileImage.src} alt="Profile" className="w-9 h-9" />
          ),
        },
        {
          name: "GitHub",
          url: "https://github.com/LAP-Tutorials",
          icon: <FaGithub />,
        },
        {
          name: "Patreon",
          url: "https://patreon.com/lap_mgmt",
          icon: <FaPatreon />,
        },
        {
          name: "TikTok",
          url: "https://tiktok.com/@lap_mgmt",
          icon: <FaTiktok />,
        },
        {
          name: "Instagram",
          url: "https://instagram.com/lap.mgmt.team",
          icon: <FaInstagram />,
        },
        {
          name: "Email Us",
          url: "mailto:contact@lap.onl",
          icon: <FaEnvelope />,
        },
      ],
    },
  ];

  return (
    <div className="relative w-full min-h-screen bg-background">
      {/* Foreground Content */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-xl mx-auto p-6 mt-8">
        {/* Profile Section */}
        <div className="flex flex-col items-center">
          <div
            className="w-20 h-20 rounded-full bg-accent mb-4 bg-center bg-cover"
            style={{ backgroundImage: `url('/arclapain-profile.png')` }}
          ></div>
          <h1 className="text-xl font-semibold text-white">
            Llewellyn Paintsil
          </h1>
          <p className="text-sm text-gray-400">
            Content Creator and Software Developer
          </p>
        </div>

        {/* Links Sections */}
        {sections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="mt-6 w-full">
            <h2 className="text-center text-lg mb-4 text-white">
              {section.header}
            </h2>
            {section.links.map((link, index) => (
              <a
                key={index}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between bg-card text-accent py-5 px-8 mb-3 hover:bg-[#8a2be2] duration-700 transition"
              >
                <div className="flex items-center">
                  <span className="text-4xl text-white mr-7">{link.icon}</span>
                  <span className="text-white">{link.name}</span>
                </div>
              </a>
            ))}
          </div>
        ))}

        {/* Footer Section */}
        <Link href="https://github.com/Llewellyn500/socialize">
          <button className="mt-6 bg-[#8a2be2] text-[#121212] font-bold py-2 px-6 rounded-full hover:bg-[#8a2be250] duration-700 transition">
            Create your own
          </button>
        </Link>
      </div>
    </div>
  );
}
