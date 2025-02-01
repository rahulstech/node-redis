/**
 * this is a simple simulation of caching a query result using redis hash.
 * user is kept in cache in 60 seconds only. when that time elapsed then user
 * is removed from cache i need to recache the user. this method reduces the no 
 * of query to database. 
 * 
 * this caching can  be used to check if user is logged in or not. on successful
 * login i will save the user in cache with a proper expiry. therefore for any following
 * requests from the same user till the expire i can simply check the cache and match the user
 * credential to authentication and authorize. meanwhile if user changes his credentials then
 * cache is invalidated and recached on next login. thus. reduces no of db call on each authentication
 * and authorization.
 * 
 * redis command used here used
 * ============================
 * 
 * hset hash-name name1 value1 name2 value2 ... : creats a new hash with name hash-name and properties key1 key2 etc
 *                                                with values value1 value2 respectively
 * 
 * hgetall hash-name : get all key-value pairs for hash hash-name if exists. in nodejs it returns, if exists, an object with all
 *                     properties set and values as string or an empty object if not exists
 * 
 * expire hash-name seconds : sets expiration time for the hash hash-name. note that expiration time in seconds. this command can be
 *                            used to set expiration time for any key not only hash
 */

const { createClient } = require('redis')
const users = require('./users.json')

const ONE_MINUTE = 60 

const client = createClient({
    url: 'redis://localhost:63791'
})

client.on('error', err => {
    console.log('client side error ', err)
})

/**
 * Finds in user in databse and returns if found
 * 
 * @param {number} id 
 * @returns { Object | null } the user object if found or null
 */
function findUserById(id) {
    const user = users.find( user => user.id === id)
    if (!user) {
        console.log('no user exists by id ', id)
        return null
    }
    console.log('user exists by id ', id)
    return user
}

/**
 * Finds the user by id in cache and returns if found
 * 
 * @param {number} id 
 * @returns { Object | null } return the user object if found or null
 */
async function getUserFromCache(id) {
    const user = await client.hGetAll(`user:${id}`)
    if (!user || Object.keys(user).length === 0) {
        console.log(`user with id ${id} not found in cache`)
        return null
    }
    console.log(`user with id ${id} found in cache`)
    return user
}

// save the user in cache with expire seconds. default expire is one minute
async function saveUserInCache(id, user, expire = ONE_MINUTE) {
    const key = `user:${id}`
    const validExpire = expire > 0 ? expire : ONE_MINUTE
    const result = await client.hSet(key, user)
    if (result > 0) {
        await client.expire(key, validExpire)
        console.log(`user with id ${id} cached for ${expire} seconds`)
        return true
    }
    console.log(`user with id ${id} not cahced`)
    return false
}

async function getUserById(id) {
    // try get user from cache
    const cachedUser = await getUserFromCache(id)

    // if found return
    if (null !== cachedUser) {
        return cachedUser
    }

    // if not found, find in database
    const user = findUserById(id)

    // if not found  in database, return null
    if (null === user) {
        return null
    }

    // if found in database, save in cache and return
    if (await saveUserInCache(id, user)) {
        return user
    }

    // if fail to store in cache throw error
    throw new Error('fail to save in cache')
}

async function testGetUserById(id) {
    const user = await getUserById(id)

    console.log(`user:${id} = `, JSON.stringify(user, null, 2))

    console.log('============================================================')
}

client.connect()
.then(async () => {

    const id = 123

    await client.del(`user:${id}`)

    // try to get user by id, since it's does not exists in cache it finds in database
    // then save it in cache with expiration one minute then returns
    setImmediate(() => testGetUserById(id))

    // since only 40 seconds elapsed so user must exists in cache, therefore this time
    // it must return from cache
    setTimeout(() => testGetUserById(id), 40 * 1000)

    // but now more than one minute elapsed so user does not exists in cache so again it
    // will find in database and cache it again then return
    setTimeout(() => testGetUserById(id), 65 * 1000);

    setTimeout(() => {
        client.quit()
    }, 70 * 1000);
})
.catch( err => {
    console.log('an error occurred ', err)
})