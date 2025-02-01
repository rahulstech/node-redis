/**
 * this is a simple published consumer example using redis list with block pop using single client
 * here publisher pusblishing on fixed interval of 500ms.
 * consumer blocks 700ms for next result if no result found then it
 * wait for cetain amount of misses with delays
 */
const { createClient } = require('redis')

const client = createClient({
    url: 'redis://localhost:63791'
})

client.on('error', err => {
    console.log('client side error ', err)
})

async function publisher(count) {
    // publishing count item on 500ms interval

    const instance = setInterval(() => {

        if (count === 0) {
            console.log('no more item to push')

            // stop repeted execution. this is important otheriwse it will keep pusblishing
            clearInterval(instance)
            return
        }

        const item = `Item ${count}`

        console.log('pushing item ', item)

        client.lPush('items', item)

        --count
    }, 500);
}

function wait(millis) {
    return new Promise( resolve => setTimeout(resolve, millis))
}

// why i have to write extra wait function for consumer code?
// because i am using the same client for pusblishing and consuming.
// therefore, if consumer code starts waiting indefinitely first 
// then all the producer cammands are unhandled
// if i use two different clients one for producing and other for consuming
// then indefinite consumer client blocking will not cause accepting commands froduver producer client
async function consumer(timeout = 2000, maxMiss = 3) {
    let miss = 0
    while(true) {
        console.log('waiting for next item...')
        // why do i need to use a smaller timeout for brPop?
        // because if any blocking pop command is sent before any push command 
        // then server remains blocked for that amount of time, meanwhile any push command
        // will be ignored. commands sent during blocked period is not queue on serverside.
        // therefore, after unblocking the push commands are lost and not executed 
        const item = await client.brPop('items', .7)

        // if nothing is popped then i will wait for longer time till next try
        // i am calling this condition miss and i will allow miss upto maxMiss times
        if (null === item) {
            console.log('brPop timeout')
            // if maxMiss already completed then exit looping
            // if  not then increase the no of miss
            if (miss == maxMiss) {
                console.log('can not wait for consuming')
                break
            }
            else {
                miss++
                await wait(timeout)
                continue
            }
        }
        // i am counting the consecutive misses only. so, after 2 miss if non null is popped
        //  then miss counter is reset
        miss = 0
        console.log('next item: ', item)
    }
}

client.connect()
.then(async () => {

    await client.del('items')

    publisher(10)

    await consumer()

    await client.quit()
})
.catch(err => { 
    console.log('an error occurred: ', err)
})