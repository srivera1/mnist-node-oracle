# mnist-node-oracle


MNIST Web App with Oracle Database driver for Node.js

This code connects to a [DB](https://github.com/oracle/srivera1/mnist_oracle) with a [Machine Learning Model](https://github.com/srivera1/mnist_oracle/tree/master/exported_mnist_trained) and gets a prediccion for a given hand writen number.


      // Send predictor query to ORACLE server
      // PX are the individual image's pixels
      const result = await connection.execute(
        `SELECT prediction(DEEP_LEARNING_MODEL USING
          :idbv as PX1, :idbv as PX2, :idbv as PX3, ....
          ) pred FROM dual`,
        id);
      console.log("Result from db: ");
      console.log(result);


![front](https://github.com/srivera1/mnist-node-oracle/blob/master/img/front.png?raw=true)

## Clone and install

$ git clone https://github.com/oracle/srivera1/mnist-node-oracle.git

$ npm install

## Configure the connection to a server with ORACLE db

vim launch_server.sh

## Launch the node.js web server

$ bash ./launch_server.sh

## Connect with the browser to the web server

$ firefox localhost:7000


## Testing

$ bash ./test_back_MNIST.sh


## Todo



## References

https://maneprajakta.github.io/Digit_Recognition_Web_App/


https://github.com/oracle/node-oracledb


https://github.com/oracle/srivera1/mnist_oracle