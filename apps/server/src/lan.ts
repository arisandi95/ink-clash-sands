import os from 'node:os';
import qrcodeTerminal from 'qrcode-terminal';

export interface LanAddress {
  name: string;
  address: string;
  url: string;
}

export function getLanAddresses(port: number): LanAddress[] {
  const interfaces = os.networkInterfaces();
  const results: LanAddress[] = [];
  for (const [name, addresses] of Object.entries(interfaces)) {
    for (const address of addresses ?? []) {
      if (address.family === 'IPv4' && !address.internal) {
        results.push({
          name,
          address: address.address,
          url: `http://${address.address}:${port}`
        });
      }
    }
  }
  return results;
}

export function printServerInfo(port: number, host: string): void {
  const lanAddresses = getLanAddresses(port);
  console.log('');
  console.log('  InkClash siap dimainkan.');
  console.log(`  Lokal     : http://localhost:${port}`);
  if (host !== '0.0.0.0' && host !== '127.0.0.1') {
    console.log(`  Bind      : http://${host}:${port}`);
  }
  if (lanAddresses.length === 0) {
    console.log('  LAN       : tidak ada alamat LAN terdeteksi. Cek koneksi jaringan.');
  } else {
    for (const lan of lanAddresses) {
      console.log(`  LAN (${lan.name}) : ${lan.url}`);
    }
    const primary = lanAddresses[0];
    if (primary) {
      console.log('');
      console.log('  Pindai QR ini dari HP di jaringan yang sama:');
      qrcodeTerminal.generate(primary.url, { small: true });
    }
  }
  console.log('');
  console.log('  Firewall: izinkan port ini di Windows Defender / macOS / ufw.');
  console.log('  Semua pemain harus berada di jaringan/VLAN yang sama.');
  console.log('');
}
