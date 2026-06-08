import Link from "next/link"
import { prisma } from "@/lib/prisma"
import styles from "./site-footer.module.css"

async function getSettings() {
  try {
    let settings = await prisma.siteSettings.findUnique({ where: { id: "default" } })
    if (!settings) {
      settings = await prisma.siteSettings.create({ data: { id: "default" } })
    }
    return settings
  } catch {
    return null
  }
}

const footerColumns = [
  {
    title: "Shop",
    links: [
      ["All Products", "/products"],
      ["New Arrivals", "/new-arrivals"],
      ["About Doshok", "/about"],
      ["Contact", "/contact"],
    ],
  },
  {
    title: "Help",
    links: [
      ["Help Hub", "/help"],
      ["FAQ", "/faq"],
      ["Size Guide", "/size-guide"],
      ["Care Guide", "/care-guide"],
      ["Track Order", "/track-order"],
    ],
  },
  {
    title: "Policy",
    links: [
      ["Policy Hub", "/policy"],
      ["Privacy Policy", "/privacy-policy"],
      ["Terms & Conditions", "/terms"],
      ["Return Policy", "/return-policy"],
      ["Delivery Policy", "/delivery"],
    ],
  },
]

export async function SiteFooter() {
  const settings = await getSettings()
  const socials = [
    ["f", settings?.facebookUrl, "Facebook"],
    ["◎", settings?.instagramUrl, "Instagram"],
  ].filter((social): social is [string, string, string] => Boolean(social[1]))

  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div>
          <Link href="/" className={styles.logo}>
            <span className={styles.mark}>D</span>
            <span className={styles.word}>
              Doshok<span className="text-[#ee2c3c]">.</span>com
            </span>
          </Link>
          <div className={styles.brandTag}>&quot;Let&apos;s Shop Beyond Boundaries&quot;</div>
          <div className={styles.brandBn}>দশক — আপনার প্রতিদিনের স্টাইল</div>
          {socials.length > 0 && (
            <div className={styles.socials}>
              {socials.map(([label, href, name]) => (
                <a key={name} href={href} target="_blank" rel="noopener noreferrer" aria-label={name}>
                  {label}
                </a>
              ))}
            </div>
          )}
        </div>

        {footerColumns.map((column) => (
          <div key={column.title} className={styles.footCol}>
            <h4>{column.title}</h4>
            <ul>
              {column.links.map(([label, href]) => (
                <li key={label}>
                  <Link href={href}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className={styles.copyright}>© 2001 — 2025, Doshok.com</div>
    </footer>
  )
}
