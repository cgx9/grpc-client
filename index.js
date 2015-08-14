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
  this.header = config.header || {};
  this.currentCall = null;
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
  var grpcLoadStr = "grpc.load(protoFilePath)." + sch.package;
  var ProtoClass = eval(grpcLoadStr);//grpc.load(protoFilePath)[sch.package];
  for (var i = 0; i < sch.service.services.length; i++) {
    (function(serviceFuncName){  
      GrpcClient.prototype[serviceFuncName] = GrpcClient.prototype[firstToLowerCase(serviceFuncName)] = promise.promisify(function(data,cb){
          var client = new ProtoClass[sch.service.name](this.host);
          client[firstToLowerCase(serviceFuncName)](data,cb,this.header);
      });
    }).call(this,sch.service.services[i])
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