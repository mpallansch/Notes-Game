import fetch from 'node-fetch';

const apiRoot: string = 'http://localhost:3001/';

const start = async ( index: number ) => {

    let formData = {
        'email': `foo${ index ? ( index + 1 ) : '' }@test.com`,
        'username': `foo${ index ? ( index + 1 ) : '' }`,
        'password': 'something123'
    };

    const response = await fetch( apiRoot + 'register', {
        method: 'POST',
        body: JSON.stringify( formData ),
        headers: {
            'Content-Type': 'application/json'
        }
    } );

    if ( response.ok ) {
        const data = await response.json();
        console.log( data );
    } else {
        console.log('Error registering user', response.statusText );
    }
};

for(let i: number = 0; i < 8; i++) {
    start( i );
}
