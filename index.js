"use strict"

const DatabaseAbstractor = require('database-abstractor');

const catalogdb = new DatabaseAbstractor();

const db = {
  host: null,
  port: null
}

const catalog01 = {
  catalogId: 'ca-emb',
  courses: {
    courseId: 'emb-01'
  }
  
}


module.exports = {

  _dbready: false,

  _tables: null,

  _users: {},

  queue: [],

  use({host, port}) {
    db.host = host;
    db.port = port;

    catalogdb.use(require('catalogdb-dynamodb-driver')(
      {
        region : 'us-west-2', 
        endpoint : `${db.host}:${db.port}`
      },
      (err, data) => {
        if (err) {
          console.log('Failed to init local db')
          throw new Error(err)
        } else {
          this._dbready = true;
          this._tables = data.TableNames;
          if (this.queue.length > 0) {
            this.queue.forEach(fn => this[fn.name].apply(this,fn.args))
          }
        }
      }
    ))

    return this;
  },

  init(done) {
    if (!db.host && !db.port) {
      throw new Error('host and port of database must be define.')
    }
    if (this._tables) {
      if (this._tables.indexOf('CATALOG') === -1) {
        console.log('\nInitializing CATALOG Table...')
        return this.new(() => {
          console.log('CATALOG Table is created and ready to use.');
          done && done();
        });
      } else {
        console.log('CATALOG Table already exists');
        done && done();
        return this;
      }
    } else {
      this.queue.push({name: 'init', args: [done]})
    }
  },

  new(done) {
    if (!db.host && !db.port) {
      throw new Error('host and port of database must be define.')
    }
    if (this._dbready) {
      catalogdb.createTable((err, data) => {
        if (err) {
          console.log('Failed to create CATALOG table')
          console.log(err);
        } else {  
          this._createNewEntries(done);
        }
      })
    } else {
      this.queue.push({name: 'new', args: [done]})
    }
    return this;
  },

  reset () {
    if (!db.host && !db.port) {
      throw new Error('host and port of database must be define.')
    }
    const self = this;
    if (this._dbready) {
      catalogdb.dropTable(function(err, data) {
        if (err) {
          console.log('Failed to drop ENROLL table')
          console.log(err);
        } else {
          console.log('Dropped old CATALOG table')
          catalogdb.createTable((err, data) => {
            if (err) {
              console.log('Failed to create CATALOG table')
              console.log(err);
            } else {  
              self._createNewEntries();
            }
          })
        }
      })
    } else {
      this.queue.push({name: 'reset', args: [done]})
    }
    return this;
  },

  _createNewEntry(uid, catalog) {
    return new Promise((resolve, reject) => {
      catalogdb.createCatalog({ uid, catalog }, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data)
        }
      })
    })
  },

  _createNewEntries(done) {
    console.log('Creating new catalog entry...')  
    Promise.all([
      this._createNewEntry('tester@team.com', catalog01), 
    ]).then(values => {
      console.log('Created all catalog.')
      done && done();
    }).catch(function(err) {
      console.log(err);
      done && done(err)
    });
    return this;
  }

}

