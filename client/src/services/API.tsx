import config from '../constants/Config';

export default { 
  request: (relativeUrl: string, options: RequestInit = {} as RequestInit) => {
    options.credentials = 'include';

    return new Promise((resolve, reject) => {
      fetch(`${config.apiRoot}${relativeUrl}`, options).then((response: any) => {
        switch(response.status){
          case 200:
            response.json().then((responseObj: any) => {
              if(responseObj.error){
                reject(responseObj.message);
              } else {
                resolve(responseObj.data);
              }
            }, () => {
              reject('Error making request. Unable to parse response from server, please wait and try again later');
            }).catch(() => {
              reject('Error making request. Unable to parse response from server, please wait and try again later');
            });
            break;
          case 401:
            reject('Error making request. User is not signed in.');
            break;
          default:
            reject('Error making request. There is an issue with the server, please wait and try again later');
            break;
        }
      }, (e) => {
        console.log(e);
        reject('Error making request. Please check your network connection and try again.');
      }).catch((e) => {
        console.log(e);
        reject('Error making request. Please check your network connection and try again.');
      });
    });
  }
} as {
  request: Function
}