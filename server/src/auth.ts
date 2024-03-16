import crypto from 'crypto';

let auth = { 
  generateSalt: (rounds: number) => {
    if (rounds >= 15) {
      throw new Error(`${rounds} is greater than 15,Must be less that 15`);
    }
    if (typeof rounds !== 'number') {
        throw new Error('rounds param must be a number');
    }
    if (rounds == null) {
        rounds = 12;
    }
    return crypto.randomBytes(Math.ceil(rounds / 2)).toString('hex').slice(0, rounds);
  },

  hasher: (password: string, salt: string) => {
    let hash = crypto.createHmac('sha512', salt);
    hash.update(password);
    let value = hash.digest('hex');
    return {
        salt: salt,
        hashedpassword: value
    };
  },
  generateToken: () => {
    return new Promise<string>((resolve, reject) => {
      crypto.randomBytes(48, function(err, buffer) {
        if(err){
          reject();
          return;
        }
        
        resolve(buffer.toString('hex'));
      });
    });
  },
  hash: (password: string, salt: string) => {},
  compare: (password: string, hash: any) => {return false;}
}

auth.hash = (password: string, salt: string) => {
  if (password == null || salt == null) {
      throw new Error('Must Provide Password and salt values');
  }
  if (typeof password !== 'string' || typeof salt !== 'string') {
      throw new Error('password must be a string and salt must either be a salt string or a number of rounds');
  }
  return auth.hasher(password, salt);
};

auth.compare = (password: string, hash: any) => {
  if (password == null || hash == null) {
      throw new Error('password and hash is required to compare');
  }
  if (typeof password !== 'string' || typeof hash !== 'object') {
      throw new Error('password must be a String and hash must be an Object');
  }
  let passwordData = auth.hasher(password, hash.salt);
  
  if (passwordData.hashedpassword === hash.hashedpassword) {
      return true;
  }
  return false
};

export default auth;