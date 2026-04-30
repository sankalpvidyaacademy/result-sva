// Deploy Firestore Security Rules using Firebase Admin SDK
// This script deploys the Phase 2 security rules to the Firestore database
// Usage: bun run scripts/deploy-rules.ts

import admin from 'firebase-admin'
import { readFileSync } from 'fs'

// Initialize Firebase Admin
const serviceAccount = {
  projectId: 'sankalp-result-system',
  clientEmail: 'firebase-adminsdk-fbsvc@sankalp-result-system.iam.gserviceaccount.com',
  privateKey: `-----BEGIN PRIVATE KEY-----
MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQCxGJU6llmjGFSq
L54w2bUsSU4Py/3NIRlRFu5+EZPxN78+7Zit6eMrETHVQgCDqnwJGTvWrSLG0Ocv
WQqrNpUu7zjtyrS2g6SCqI95WsDiJ95xfT5d72yhWsenVjPD6pUAmkSCwS3yHTpG
NRh+IZ9BqlfDyac5mn5JiDVTdellg9Wp+pIRd6X+mlnDsDP4YEHEzFgHk/a5qAsu
JeA/eO1dOe5+bfV8BZOSTstTrn4ekvWxO4EMI3GFhkY/SJmAw5G/K1Xb9Zvf1DjH
hoeWYgK//lg+hJgzWYKB7zP5jAxR4PPIao7wDWv72FWZzkSHiUCz4Jmoka1VUQre
+Ot6nX0JAgMBAAECggEANIDCwS9Q3NL6Ssg6QGZS2ZHUBEfoczekX0+KnjKM5z8t
QjVDhg/oqtx6pyxdpatWAYaLIH6M6F+Hophl2tOgT91ZRdpKUC/gBmJ9wq8erw29
22yToFq6nG2i8l/SkftKeHbD5/XorrZuj+Du5XoHUnrzcRaoLqI4XYl1scwryU3Z
pF+a0F+ZtzplergenzPw4Q0FqlV+ceMWeMuwJ/jj5OOqZGjw0AGXzyrlYKrSrJ2w
0UEp489vo4qbur4u2R0GjhgAC5dL7DzVfh+oE96/LRTxImQyl3mtEyycpIvej8z/
T01f4IYstUI3XRHJ+FNq7dybApRxaL/JLRrm6xV/dwKBgQDc+gEEK4RyvWIWaBpd
UL38E+tcWD9lSjfCMGVQpgVAP5s+9JseCW5H/cJg/g5veoBHQixc7V19m3BOjQxT
lUJv5/giz9+sroliS4PQcdrdh4k//FwW/j0FVIEW2k6LkqtmJzER63vlVUFafJpj
ewMpzAxBN2nxgZ63f3ZQ42bnawKBgQDNKiaxN2QYop7mcmDSLWhIxjErIFtxNXHZ
K11mcvwAeA7ccM4MmzM/NhhDXbgZPd6oTsqw0ZrKFoZQe8z0sY1ZvoBLxu2CvDOr
8l+x1RzjYhQNRaAsrPLYl+oxbIXiCqqcz51A4nf89s4nNAjM154gHJ/mlk4bxVh0
SauRN1wuWwKBgQC97CXJdrmMgFb4mRrnzwiqylgEc1hxbxuDTGMXsMlckg6VSliz
tTlSqLhS8qhniesM08QbTmuHFHyvFq1cfTGvyrjK+szstsofcHXnRqPsuJvvIa/o
lzTNCvc0NAdEEJg94Ttcgn9m+SKFagirrcNnPhfeSYlF57kJT4TaOshr5wKBgQCX
aE0HqbYgDBsyPCTB1yrH0iPFDOsO3/814q/aBG9/NRraihE18m9ebeB4DrjnP+aK
1SL2XKlcDEVxLfvydPm4ykLKKXNscNG9SnBev8TC9cWQidqMPdI2D96QPOONDowc
j4cgtEESmV1IRzlbWqBiWF2VAUWBbyE5KIkJ8Q4BUwKBgQDZSYOrBprdHgeC+Vnb
6L7PHf83Zl3uDwpusC99+6cAjZtjE3uKMW9l81QZIumpfqFclEPoMs6/Hceif1Zt
fFVoZ928ZUGIIAQt01tt5TssGueOfpKPPlphA++mAwT2rwRe+7CYm7SGj+cubADt
owxM/dUqRhbijo0Rzu8vEoszPA==
-----END PRIVATE KEY-----`,
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'sankalp-result-system',
  })
}

async function deployRules() {
  console.log('🔧 Deploying Firestore Security Rules (Phase 2)...')
  console.log('   Project: sankalp-result-system')
  console.log('')

  try {
    // Read the rules file
    const rulesContent = readFileSync('./firestore.rules', 'utf8')

    // Deploy rules using Admin SDK
    await admin.securityRules().releaseFirestoreRulesetFromSource(rulesContent)

    console.log('✅ Firestore Security Rules deployed successfully!')
    console.log('')
    console.log('📋 Rules Summary:')
    console.log('   - All client-side writes are BLOCKED')
    console.log('   - Reads allowed from app origin')
    console.log('   - All writes go through API routes (Admin SDK bypasses rules)')
    console.log('   - Users collection: read-only from client')
    console.log('   - Classes/Subjects: read-only from client')
    console.log('   - Teachers/Students: read-only from client')
    console.log('   - Tests/Marks: read-only from client')
    console.log('   - Sessions/AuditLogs: fully restricted')
    console.log('')
  } catch (error) {
    console.error('❌ Failed to deploy rules:', error)
    process.exit(1)
  }
}

deployRules()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Script failed:', err)
    process.exit(1)
  })
