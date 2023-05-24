/* This file contains all the helper functions which are required through out the application.*/

// A function which provides a random integer between the given ranges.
const randomIntFromInterval = (min, max) => { // min and max included 
    return Math.floor(Math.random() * (max - min + 1) + min)
}

// A function which deplays any execution if called along with await.
const delay = async (ms) => {
    return await new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    randomIntFromInterval,
    delay
}