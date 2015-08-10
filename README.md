# grpc-client
## example
```javascript  
var grpcClient = require('grpc-client');
var gc = new grpcClient({host:"localhost:50051",dir:'./',header:{custom:['customvalue']}});

gc.proto("helloworld")
  .sayHello({name:"xing"})
  .then(function(res){
    console.log(res);
  })
  .catch(function(err){
    console.log(err);
  })  

or  

gc.proto("helloworld")
  .call("SayHello")
  .send({name:"xing"})
  .then(function(res){
    console.log(res);
  })
  .catch(function(err){
    console.log(err);
  })
```
> *host* is grpc server  
> *dir* is proto file folder  
> *header* is your custom matedata  