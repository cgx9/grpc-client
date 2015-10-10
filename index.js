var grpc = require('grpc');
var schema = require('protocol-buffers-schema');
var promise = require('bluebird');
var fs = require('fs')

var GrpcClient = function(config){
  if (typeof String.prototype.endsWith !== 'function') {
    String.prototype.endsWith = function(suffix) {
      return this.indexOf(suffix, this.length - suffix.length) !== -1;
    };
  }

  this.host = config.host || "";
  this.protodir = config.dir || "";
  this.header = config.header || null;
  this.currentCall = null;
  this.log = config.log || console;
  this.serviceName = "";
  return this;
}

// parse proto file and create action;
GrpcClient.prototype.proto = function(protofile){
  var protoFilePath = "";
  if(this.protodir){
    if(this.protodir.endsWith("/")){
      protoFilePath = this.protodir + (protofile.endsWith(".proto")? protofile: protofile + ".proto");
    }else{
      protoFilePath = this.protodir + "/" + (protofile.endsWith(".proto")? protofile: protofile + ".proto");
    }
  }
  var sch = schema(fs.readFileSync(protoFilePath));
  if(this.serviceName && this.serviceName != sch.service.name){
    throw new Error("Not allow multiple proto file of the same instances!");
  }
  this.serviceName = sch.service.name;
  var grpcLoadStr = "grpc.load(protoFilePath)." + sch.package;
  var ProtoClass = eval(grpcLoadStr);//grpc.load(protoFilePath)[sch.package];

  if(grpc.Credentials !== undefined && grpc.Credentials.createInsecure !== undefined){
    this.client = this.client || new ProtoClass[this.serviceName](this.host,grpc.Credentials.createInsecure());
  }else{
    this.client = this.client || new ProtoClass[this.serviceName](this.host);
  }

  for (var i = 0; i < sch.service.services.length; i++) {
    (function(serviceFuncName,protoFilePath){  
      GrpcClient.prototype[serviceFuncName] = GrpcClient.prototype[firstToLowerCase(serviceFuncName)] = promise.promisify(function(data,cb){
        var startTime = new Date();
        
        var injectionLogCb = function(err,result){
          var endTime = new Date();
          var executeTime = endTime-startTime;
          if(err){
            var logErr = {type:"grpc_err",path:protoFilePath,func:serviceFuncName,headers:this.header,params:data,errMsg:err,executeTime:executeTime}
            this.log.error(logErr);
          }else{
            var logInfo = {type:"grpc_res",path:protoFilePath,func:serviceFuncName,headers:this.header,params:data,executeTime:executeTime}
            this.log.info(logInfo);
          }
          return cb(err,result);
        }.bind(this);

        var customMetadata = this.header;
        if(grpc.Metadata){//grpc is 0.11
          if(this.header){
            var metadata = new grpc.Metadata();
            for (var item in this.header) {
              if(Array.isArray(this.header[item])){
                for (var i1 = 0; i1 < this.header[item].length; i1++) {
                  metadata.add(item,this.header[item][i1])
                };
              }else{
                metadata.add(item,this.header[item])
              }
            };
            customMetadata = metadata;
          }
        }
        this.client[firstToLowerCase(serviceFuncName)](data,injectionLogCb,customMetadata);
      });
    }).call(this,sch.service.services[i],protoFilePath)
  }
  return this;
}

GrpcClient.prototype.call = function(name){
  this.currentCall = name;
  return this;
}

GrpcClient.prototype.send = function(data){
  return this[this.currentCall](data);
}

GrpcClient.prototype.host = function(host){
  this.host = host;
  return this;
}

GrpcClient.prototype.dir = function(dir){
  this.protodir = dir;
  return this;
}

GrpcClient.prototype.header = function(header){
  this.header = header;
  return this;
}

function firstToLowerCase(str){
  return str.replace(/\b\w+\b/g,function(tmpStr){
    return tmpStr.substring(0,1).toLowerCase()+tmpStr.substring(1);
  })
}
module.exports = GrpcClient;