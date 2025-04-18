import { SignJWT } from 'jose'
import { createPrivateKey } from 'crypto'

export async function generateClientSecret() {
  const teamId = 'W7J832VH7L'
  const clientId = 'com.julip.auth.apple'
  const keyId = '453UBF3VUP'

  const privateKeyPEM = `
  -----BEGIN PRIVATE KEY-----
  MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgoKtJeIIBOqSX0wEb
  zDe7ygI4Dv3Tb6AeGUlazgiu7/igCgYIKoZIzj0DAQehRANCAASSUBZz13Q+YtMV
  Lv5KzdLu8lUQuXtyvA47whiGciuX34Usw1zJthrAP5e7H4V6d4c+TrYnxESN7oo8
  rdmyJfzE
  -----END PRIVATE KEY-----
  `.trim()

  const now = Math.floor(Date.now() / 1000)

  const privateKey = createPrivateKey({
    key: privateKeyPEM,
    format: 'pem',
  })

  return await new SignJWT({
    iss: teamId,
    sub: clientId,
    aud: 'https://appleid.apple.com',
    iat: now,
    exp: now + 15777000,
  })
    .setProtectedHeader({ alg: 'ES256', kid: keyId })
    .sign(privateKey)
}
