var async = require('async')
var lottoConf = require("../../../conf/lotto.js")
var giftBagConf = require("../../../conf/giftBag.js")
var giveCfg = require("../../../conf/give.js")
var goldConf = require("../../../conf/goldConf.js")

module.exports = function(app) {
  return new Handler(app)
}

var Handler = function(app) {
  this.app = app
  Handler.app = app
  this.sessionService = this.app.get('sessionService')
  this.channelService = this.app.get('channelService')
}

var handler = Handler.prototype
var local = {}

//每日转盘
handler.dayLotte = function(msg,session,next) {
	var self = this
	var uid = session.get("uid")
	if(!!uid){
		//获取refreshList
	  	self.app.rpc.db.remote.getPlayerObject(session,uid,"refreshList",function(data) {
	  		//console.log(data)
	  		var myDate = new Date()
	  		var month = myDate.getMonth()
	  		var date = myDate.getDate()
	  		if(month < 10){
	  			month = "0"+month
	  		}
	  		if(date < 10){
	  			date = "0"+date
	  		}
	  		var dateString = parseInt(""+myDate.getFullYear() + month + date)
	  		// console.log(dateString)
	  		//隔日更新refreshList
	  		if(data.lottoTime < dateString){
	  			data.lottoCount = 0
	  			data.lottoTime = dateString
	  		}
	  		if(data.lottoCount >= 1){
	  			next(null,{flag : false})
	  			return
	  		}
	  		data.lottoCount++
	  		self.app.rpc.db.remote.setPlayerObject(session,uid,"refreshList",data,function() {})
	  		//领取奖品
	  		var weight = 0
	  		for(var i = 0; i < lottoConf.length; i++){
	  			weight += lottoConf[i].weight
	  		}
	  		// console.log("weight : "+weight)
	  		var rand = Math.floor(Math.random() * weight)
	  		var curWeight = 0
	  		for(var i = 0; i < lottoConf.length; i++){
	  			curWeight += lottoConf[i].weight
	  			if(rand < curWeight){
	  				//领取奖励
	  				if(lottoConf[i].type){
	  					self.app.rpc.db.remote.setValue(session,uid,lottoConf[i].type,lottoConf[i].value,function() {})
	  				}
	  				next(null,{flag : true,"data" : lottoConf[i],"index" : i})
	  				return
	  			}
	  		}
	  	})
	}else{
		next(null,{flag : false})
	}
}
//分享领取奖励
handler.shareAward = function(msg,session,next) {
	var self = this
	var uid = session.get("uid")
	if(!!uid){
	  	self.app.rpc.db.remote.getPlayerObject(session,uid,"refreshList",function(data) {
		  	//console.log(data)
	  		var myDate = new Date()
	  		var month = myDate.getMonth()
	  		var date = myDate.getDate()
	  		if(month < 10){
	  			month = "0"+month
	  		}
	  		if(date < 10){
	  			date = "0"+date
	  		}
	  		var dateString = parseInt(""+myDate.getFullYear() + month + date)
	  		//console.log(dateString)
	  		//隔日更新refreshList
	  		if(data.shareTime < dateString){
	  			data.shareCount = 0
	  			data.shareTime = dateString
	  		}
	  		if(data.shareCount >= 1){
	  			next(null,{flag : false})
	  			return
	  		}
	  		//领取奖品
	  		data.shareCount++
	  		self.app.rpc.db.remote.setPlayerObject(session,uid,"refreshList",data,function() {})
			self.app.rpc.db.remote.setValue(session,uid,"gold",2000,function(){
				next(null,{flag : true,award : "gold",value : 2000})
			})
	  	})
	}else{
		next(null,{flag : false})
	}

}
//领取低保
handler.bankruptGold = function(msg,session,next) {
	var self = this
	var uid = session.get("uid")
	if(!!uid){
		//获取refreshList
		async.waterfall([
	      function(cb) {
	      	self.app.rpc.db.remote.getPlayerInfo(session,uid,function(data) {
	      		//判断金币低于领取线
	      		//console.log(data)
	      		if(data.gold > 2000){
	      			next(null,{flag : false})
	      			return
	      		}
	      		cb()
	      	})
	      },
	      function(cb) {
		  	self.app.rpc.db.remote.getPlayerObject(session,uid,"refreshList",function(data) {
			  	//console.log(data)
		  		var myDate = new Date()
		  		var month = myDate.getMonth()
		  		var date = myDate.getDate()
		  		if(month < 10){
		  			month = "0"+month
		  		}
		  		if(date < 10){
		  			date = "0"+date
		  		}
		  		var dateString = parseInt(""+myDate.getFullYear() + month + date)
		  		//console.log(dateString)
		  		//隔日更新refreshList
		  		if(data.bankruptTime < dateString){
		  			data.bankruptTimeCount = 0
		  			data.bankruptTime = dateString
		  		}
		  		if(data.bankruptTimeCount >= 2){
		  			next(null,{flag : false})
		  			return
		  		}
		  		//领取奖品
		  		data.bankruptTimeCount++
		  		self.app.rpc.db.remote.setPlayerObject(session,uid,"refreshList",data,function() {})
	  			self.app.rpc.db.remote.setValue(session,uid,"gold",2000,function(){
					next(null,{flag : true,award : "gold",value : 2000})
	  			})
		  	})
	      }
		],
	    function(err,result) {
	      next(null,{"flag" : false,code : -200})
	      return
	    }
	  )
	}else{
		next(null,{flag : false})
	}
}

//领取充值礼包
handler.getGiftBag = function(msg,session,next) {
	var uid = session.get("uid")
	var self = this
	if(!!uid){
		//获取玩家充值信息
		self.app.rpc.db.remote.getPlayerObject(session,uid,"rechargeRecord",function(data) {
			if(giftBagConf[data.curGiftBag]){
				if(data.curValue >= giftBagConf[data.curGiftBag].RMB){
					//领取奖励
					var type = giftBagConf[data.curGiftBag].award.type
					var value = giftBagConf[data.curGiftBag].award.value
	  				if(type){
	  					self.app.rpc.db.remote.setValue(session,uid,type,value,function(){
	  						//更新礼包记录
	  						next(null,{flag : true,"data" : giftBagConf[data.curGiftBag],"index" : data.curGiftBag})
	  						data.curGiftBag++
	  						data.curValue -= giftBagConf[data.curGiftBag].RMB
	  						self.app.rpc.db.remote.setPlayerObject(session,uid,"rechargeRecord",data,function(){})
	  					})
	  				}		
				}else{
					next(null,{flag : false})
				}				
			}else{
				next(null,{flag : false})
			}
		})
	}else{
		next(null,{flag : false})
	}
}

//获取充值记录
handler.getRechargeInfo = function(msg,session,next) {
	var uid = session.get("uid")
	if(!!uid){
		this.app.rpc.db.remote.getPlayerObject(session,uid,"rechargeRecord",function(data){
			if(data){
				next(null,{flag : true,"data" : data})
			}else{
				next(null,{flag : false})
			}
		}) 
	}else{
		next(null,{flag : false})
	}
}

//购买金币
handler.buyGold = function(msg,session,next) {
	var buyType = msg.type
	if(!buyType || typeof(buyType) !== "number" || !goldConf[buyType]){
		next(null,{flag : false})
	}
	var uid = session.get("uid")
	var self = this
	if(!!uid){
		//获取钻石
		self.app.rpc.db.remote.getValue(session,uid,"diamond",function(data){
			var diamond = goldConf[buyType].diamond
			if(data && data >= diamond){
				self.app.rpc.db.remote.setValue(session,uid,"diamond",-diamond,function() {
					var gold = goldConf[buyType].gold + goldConf[buyType].give
					self.app.rpc.db.remote.setValue(session,uid,"gold",gold,function() {
						next(null,{flag : true})
					})					
				})
			}else{
				next(null,{flag : false})
			}
		})		
	}else{
		next(null,{flag : false})
	}		
}

//游戏外赠送道具
handler.give = function(msg,session,next) {
	var uid = session.get("uid")
	var giveId = msg.giveId
	var targetUid = msg.targetUid
	var self = this
	var needDiamond = 0
	if(!giveCfg[giveId] || !targetUid){
		next(null,{flag : false})
		return
	}
	if(!!uid){
		async.waterfall([
			function(cb) {
				//查询目标玩家是否存在
				self.app.rpc.db.remote.getValue(null,uid,"uid",function(data) {
					if(data){
						cb()
					}else{
						next(null,{flag : false})
						return			
					}
				})				
			},
			function(cb) {
				//查询赠送者钻石
				self.app.rpc.db.remote.getValue(null,uid,"diamond",function(data) {
					//console.log("diamond ： "+data)
					needDiamond = giveCfg[giveId].needDiamond
					if(data && data >= needDiamond){
						cb()
					}else{
						next(null,{"flag" : false})
						return
					}
				})
			},
			function(cb) {
				//扣除赠送者钻石
				self.app.rpc.db.remote.setValue(null,uid,"diamond",-needDiamond,function() {
					//增加目标金币及魅力值
					cb()
				})
			},
			function() {
				//赠送成功
				var gold = giveCfg[giveId].gold
				var charm = giveCfg[giveId].charm
				self.app.rpc.db.remote.setValue(null,targetUid,"gold",gold,function(){
					self.app.rpc.db.remote.setValue(null,targetUid,"charm",charm,function(){})
				})
				//通知被赠送玩家
				var notify = {
					"cmd" : "beGive",
					"source" : uid,
					"gold" : gold,
					"charm" : charm,
					"giveId" : giveId,
				}
				self.app.rpc.goldGame.remote.sendByUid(null,targetUid,notify,function() {})
				next(null,{"flag" : true})
			}

		],
	    function(err,result) {
	      next(null,{"flag" : false,code : 1})
	      return
	    }	
		)
	}else{
		next(null,{flag : false})
	}

}