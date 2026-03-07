/**
 * LicensingService handles client-side cryptographic verification
 * of the professional ChatWithUs license.
 */

const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuYv4J0Ep3Z1kVosp69WF
QPwTrjUHfsJlFhFnbeS48922svMj/4j3dwUlnAu5N2Ie+vXqiGH8vM29BDege6+7
7/1I9vFK9wnztQTU701JjmSEJnGq20G3Q8Zyow1Exh8zz11YpJwddt6TT0gKzpXf
4kfVmGwfIvR9g41bCZaGoOaIL4EGyHsTFxa52kddpb0j4YLXbVlbyjibI1UlgwIY
R2Ib7HyiQmTnkd5HrMiGIVH11gP8SY//JHFfCbMmPOtXxAInv3CSLdmhB2Cbkdo0
7FdK3p5XUOmAlIYubV9P97pPELzdVoHFMLbFCk2g9Qmo4t4R6J31XJbojX4fTwg7
jwIDAQAB
-----END PUBLIC KEY-----`;

class LicensingService {
    static async verifyLicense(licenseData) {
        if (!licenseData || !licenseData.SIGNATURE) {
            return { error: 'Missing license' };
        }

        try {
            // 1. Prepare content for verification
            // The order and content MUST match exactly what was signed by Python
            const fields = [];
            if (licenseData.PRODUCT) fields.push(`PRODUCT: ${licenseData.PRODUCT}`);
            if (licenseData.PROJECT) fields.push(`PROJECT: ${licenseData.PROJECT}`);
            if (licenseData.VERSION) fields.push(`VERSION: ${licenseData.VERSION}`);
            if (licenseData.DESCRIPTION) fields.push(`DESCRIPTION: ${licenseData.DESCRIPTION}`);
            if (licenseData.COMPANY) fields.push(`COMPANY: ${licenseData.COMPANY}`);
            if (licenseData['PROVIDED TO']) fields.push(`PROVIDED TO: ${licenseData['PROVIDED TO']}`);
            if (licenseData.ISSUED) fields.push(`ISSUED: ${licenseData.ISSUED}`);
            if (licenseData['VALID UNTIL']) fields.push(`VALID UNTIL: ${licenseData['VALID UNTIL']}`);
            if (licenseData['LICENSE TYPE']) fields.push(`LICENSE TYPE: ${licenseData['LICENSE TYPE']}`);

            const content = fields.join('\n');
            const encoder = new TextEncoder();
            const data = encoder.encode(content);

            // 2. Decode the signature
            const signature = Uint8Array.from(atob(licenseData.SIGNATURE), c => c.charCodeAt(0));

            // 3. Import Public Key
            const pemHeader = "-----BEGIN PUBLIC KEY-----";
            const pemFooter = "-----END PUBLIC KEY-----";
            const pemContents = PUBLIC_KEY_PEM.substring(pemHeader.length, PUBLIC_KEY_PEM.length - pemFooter.length).replace(/\s/g, '');
            const binaryDerString = window.atob(pemContents);
            const binaryDer = new Uint8Array(binaryDerString.length);
            for (let i = 0; i < binaryDerString.length; i++) {
                binaryDer[i] = binaryDerString.charCodeAt(i);
            }

            const publicKey = await window.crypto.subtle.importKey(
                "spki",
                binaryDer.buffer,
                {
                    name: "RSA-PSS",
                    hash: "SHA-256"
                },
                false,
                ["verify"]
            );

            // 4. Verify Signature
            const isValid = await window.crypto.subtle.verify(
                {
                    name: "RSA-PSS",
                    saltLength: 32
                },
                publicKey,
                signature,
                data
            );

            if (!isValid) {
                return { error: 'Invalid license signature' };
            }

            // 5. Check Expiration
            const expiryStr = licenseData['VALID UNTIL'];
            const expiryDate = new Date(expiryStr);
            const now = new Date();
            now.setHours(0, 0, 0, 0);

            if (now > expiryDate) {
                return { error: 'License expired', expired: true };
            }

            return {
                valid: true,
                project: licenseData.PROJECT,
                version: licenseData.VERSION,
                description: licenseData.DESCRIPTION,
                customer: licenseData.COMPANY,
                expires_at: expiryStr,
                provided_to: licenseData['PROVIDED TO']
            };

        } catch (err) {
            console.error('[!] Client-side licensing error:', err);
            return { error: 'License verification failed' };
        }
    }
}

export default LicensingService;
