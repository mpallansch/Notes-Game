import fetch from 'node-fetch';

const apiRoot: string = 'http://localhost:3001/';

const registerUser = async (index: number): Promise<boolean> => {
    const formData = {
        email: `foo${ index ? ( index + 1 ) : '' }@test.com`,
        username: `foo${ index ? ( index + 1 ) : '' }`,
        password: 'something123'
    };

    try {
        const response = await fetch(apiRoot + 'register', {
            method: 'POST',
            body: JSON.stringify(formData),
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json() as { error?: boolean; message?: string };
        if (response.ok && !data.error) {
            console.log(`Registered: ${formData.email}`);
            return true;
        }
        if (data.message?.includes('already registered')) {
            console.log(`Already exists: ${formData.email}`);
            return true;
        }
        console.log(`Error registering ${formData.email}:`, data.message || response.statusText);
        return false;
    } catch (err: any) {
        console.log(`Error registering ${formData.email}:`, err.message || err);
        return false;
    }
};

const main = async () => {
    console.log('AI setup: Registering test users. Ensure the server is running (npm run local from project root).');
    console.log('Server must have SKIP_EMAIL_VERIFICATION=true in server/.env\n');

    const results = await Promise.all(
        [0, 1, 2, 3, 4, 5, 6, 7].map((i) => registerUser(i))
    );

    const success = results.filter(Boolean).length;
    if (success === 8) {
        console.log('\nSetup complete. All 8 test users ready. Run "npm test" in the ai folder.');
    } else {
        console.log(`\nSetup incomplete: ${success}/8 users registered. Is the server running?`);
        process.exit(1);
    }
};

main();
