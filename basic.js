/**
 * this is my first program in redis with nodejs. 
 * 
 * import steps are
 * 
 */
const { createClient } = require('redis')

// creating a redis client
const client = createClient({

    // redis[s]://[username:password@]host[:port]
    url: "redis://localhost:63791"

    // redis server has username and password then either i can set this in url 
    // or i can set username and password properties below
    // username: <redis server username>
    // password: <redis server password>
})

// setting a global error listener to client
client.on('error', (err) => {
    console.log(`redis error `, err)
})

// connecting to the server, this is returns a promise, infact most of the client methods are async
client.connect()
.then( async () => {
    console.log('connected successfully')

    // setting string value for key 'message'
    await client.set('message', 'hello redis from node')

    // gettting string value for key 'message'
    const message =  await client.get('message')
    console.log('redis[message] = ', message)

    // disconnecting the client
    await client.disconnect()

    console.log('disconnected successfully')
})
.catch(err => {
    console.log(`redis connect error `, err)
})