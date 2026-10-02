"use client";
import Link from "next/link";
import styles from "./SiteFooter.module.css";
export default function SiteFooter(){
 const year=new Date().getFullYear();
 return <footer className={styles.footer} data-nav-surface="dark">
  <div className={styles.top}><span>VOYAGERSCAPE / END OF TRANSMISSION</span><span>51.5072° N — 0.1276° W</span></div>
  <Link href="/" className={styles.word}>V<span>:</span>/</Link>
  <div className={styles.nav}>
   <div><small>INDEX</small><Link href="/">Signal</Link><Link href="/art">Archive</Link><Link href="/about">Field Log</Link><Link href="/connect">Transmit</Link></div>
   <div><small>FREQUENCIES</small><a href="https://www.instagram.com" target="_blank" rel="noreferrer">Instagram ↗</a><a href="https://www.linkedin.com" target="_blank" rel="noreferrer">LinkedIn ↗</a></div>
   <div><small>DIRECT</small><a href="mailto:hello@voyagerscape.co">hello@voyagerscape.co</a><a href="mailto:studio@voyagerscape.co">studio@voyagerscape.co</a></div>
  </div>
  <div className={styles.bottom}><span>© {year} VOYAGERSCAPE</span><Link href="/privacy">PRIVACY PROTOCOL</Link><span>BUILT FOR DISCOVERY</span></div>
 </footer>;
}
