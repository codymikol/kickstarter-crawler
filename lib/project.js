var request = require('request'),
    cheerio = require('cheerio'),
    base_url = 'http://www.kickstarter.com',
    Queue = require('./queue').Queue,
    utils = require('./utils'),
    colors = require('colors'),
    q = require('q'),
    log = false;

module.exports = Project;

function Project(options) {
	this.url = options != undefined ? options.url || undefined : undefined;
	this.fields = new Queue();
	if(options.log) log = true;
	var FIELDS = utils.fields();
	if(options.fields) {
		for(var i in options.fields) {
			switch(options.fields[i]) {
				case 'general':
					var general = FIELDS.general;
					for(var i in general) this.fields.enqueue(general[i]);
					break;
				case 'location':
					var location = FIELDS.location;
					for(var i in location) this.fields.enqueue(location[i]);
					break;
				case 'funding':
					var funding = FIELDS.funding;
					for(var i in funding) this.fields.enqueue(funding[i]);
					break;
				case 'time':
					var time = FIELDS.time;
					for(var i in time) this.fields.enqueue(time[i]);
					break
				case 'facebook':
					var facebook = FIELDS.facebook;
					for(var i in facebook) this.fields.enqueue(facebook[i]);
					break;
				case 'other':
					var other = FIELDS.other;
					for(var i in other) this.fields.enqueue(other[i]);
					break;
				case 'media':
					var media = FIELDS.media;
					for(var i in media) this.fields.enqueue(media[i]);
					break;
				case 'pledges':
					var pledges = FIELDS.pledges;
					for(var i in pledges) this.fields.enqueue(pledges[i]);
					break;
				default:
					this.fields.enqueue(options.fields[i]);
					break;
			}
	  }
  }
}

var data_points = {
	general_title: function(html) {
		var $ = cheerio.load(html);
		return $('#project-header #title a').text();
	},
	general_creator: function(html) {
		var $ = cheerio.load(html)
		return $('#project-header #name').text()
		 
	},
	general_parentCategory: function(html) {
		var $ = cheerio.load(html);
		return $('.category').attr('data-project-parent-category');
	},
	general_subCategory: function(html) {
		var $ = cheerio.load(html);
		return $('.category').text().trim();
	},
	general_avatar: function(html) {
		var $ = cheerio.load(html);
		return $('.avatar-medium').attr('src');
	},
	general_projectUrl: function(html) {
		var $ = cheerio.load(html);
		return base_url+$('#title a').attr('href');
	},
	general_creatorUrl: function(html) {
		var $ = cheerio.load(html);
		return base_url+$('#name').attr('href');
	},
	general_projectVideo: function(html) {
		var $ = cheerio.load(html);
		return $('#video-section div').attr('data-video');
	},
	location_city: function(html) {
		var $ = cheerio.load(html);
		return $('.small_type .location a').text().toLowerCase().split(', ')[0];
	},
	location_state: function(html) {
		var $ = cheerio.load(html);
		var data = $('.small_type .location a').text().toLowerCase().split(', ')[1];
		if(utils.fromTheUS(data)) return data;
		else return ''; 
	},
	location_country: function(html) {
		var $ = cheerio.load(html);
		var data = $('.small_type .location a').text().toLowerCase().split(', ')[1];
		if(utils.fromTheUS(data)) return 'usa';
		else return $('.small_type .location a').text().toLowerCase().split(', ')[1];
	},
	funding_dollarsRaised: function(html) {
		var $ = cheerio.load(html);
		return $('#pledged').attr('data-pledged');
	},
	funding_fundingGoal: function(html) {
		var $ = cheerio.load(html);
		return $('#pledged').attr('data-goal');
	},
	funding_percentRaised: function(html) {
		var $ = cheerio.load(html);
		return parseFloat($('#pledged').attr('data-percent-raised')*100).toFixed(2);
	},
	funding_currency: function(html) {
		var $ = cheerio.load(html);
		return $('#pledged data').attr('data-currency');
	},
	funding_successful: function(html) {
		var $ = cheerio.load(html);
		return parseFloat($('#pledged').attr('data-percent-raised')*100).toFixed(2) >= 100;
	},
	funding_backers: function(html) {
		var $ = cheerio.load(html);
		return $('#backers_count').attr('data-backers-count');
	},
	time_days: function(html) {
		var $ = cheerio.load(html);
		return parseFloat($('#project_duration_data').attr('data-duration'));
	},
	time_start: function(html) {
		var end = data_points.time_end(html),
		duration = data_points.time_days(html)*1000*60*60*24;
		return end - duration;
	},
	time_end: function(html) {
		var $ = cheerio.load(html),
		endtime = $('#project_duration_data').attr('data-end_time'),
		date = new Date(endtime);
		return date.getTime();
	},
	facebook_connected: function(html) {
		var $ = cheerio.load(html);
		return $('#creator-details ul li').eq(1).attr('class') === 'facebook-connected';
	},
	facebook_name: function(html) {
		var $ = cheerio.load(html),
		name = $('#creator-details .facebook-connected a').text();
		if(name !== undefined || '') return name;
		else if(!data_points.facebook_connected()) return 'facebook not connected';
		else 'error: invalid crawl';
	},
	facebook_link: function(html) {
		var $ = cheerio.load(html),
		link = $('#creator-details .facebook-connected a').attr('href');
		if(link !== undefined || '') return link;
		else if(!data_points.facebook_connected()) return 'facebook not connected';
		else 'error: invalid crawl';
	},
	facebook_numFriends: function(html) {
		var $ = cheerio.load(html);
		var numFriends = $('#creator-details .facebook-connected a').next().text().trim().split('\n')[0];
		if(numFriends !== undefined || '') return numFriends;
		else if(!data_points.facebook_connected()) return 'facebook not connected';
		else return 'error: invalid crawl';
	},
	other_updates: function(html) {
		var $ = cheerio.load(html);
		return $('#updates_count').attr('data-updates-count');
	},
	other_comments: function(html) {
		var $ = cheerio.load(html);
		return $('#comments_count').attr('data-comments-count');
	},
	other_projectsCreated: function(html) {
		var $ = cheerio.load(html);
		if($('#creator-details .text').eq(0).text().trim().toLowerCase().split('\n')[0] === 'first created') return 1;
		else return $('#creator-details .text').eq(0).text().trim().toLowerCase().split(' ')[0];
	},
	other_projectsBacked: function(html) {
		var $ = cheerio.load(html);
		var data = $('#creator-details .text').eq(0).text().trim().toLowerCase().split('\n')[2];
		return data.split(' ')[0];
	},
	other_websiteLink: function(html) {
		var $ = cheerio.load(html);
		return $('#creator-details .links a').attr('href');
	},
	other_websiteName: function(html) {
		var $ = cheerio.load(html);
		return $('#creator-details .links a').text().split('.')[0];
	},
	media_numPictures: function(html) {
		var $ = cheerio.load(html),
		count = 0;
		$('img').each(function(i, elem) { count++; });
		return count;
	},
	media_pictures: function(html) {
		var $ = cheerio.load(html);
		var pics = [];
		$('img').each(function(i, elem) { pics.push($(this).attr('src')) });
		return pics;
	},
	pledges_number: function(html) {
		var $ = cheerio.load(html);
		return $('.NS-projects-rightcol-rewards').attr('data-reward-count');
	},
	pledges_limited: function(html) {
		var $ = cheerio.load(html),
		count = 0;
		$('.limited-number').each(function(i, elem) { count++; });
		return (count === 0) ? false : true;
	},
	pledges_soldOut: function(html) {
		var $ = cheerio.load(html),
		count = 0;
		$('.sold-out').each(function(i, elem) { count++; });
		return count;
	},
	pledges_percentLimited: function(html) {
		var $ = cheerio.load(html),
		count = 0;
		$('.limited-number').each(function(i, elem) { count++; });
		var numLimited = count;
    		var numPledges = $('.NS-projects-rightcol-rewards').attr('data-reward-count');
		return parseFloat(numLimited/numPledges*100).toFixed(2);
	},
	pledges_percentSoldOut: function(html) {
		var $ = cheerio.load(html),
		numSoldOut = 0,
		numPledges = $('.NS-projects-rightcol-rewards').attr('data-reward-count');
		$('.sold-out').each(function(i, elem) { numSoldOut++; });
		return parseFloat(numSoldOut/numPledges*100).toFixed(2);
	},
	pledges_amounts: function(html) {
		var $ = cheerio.load(html),
		amounts = [];
		$('.NS-projects-rightcol-rewards h5 span').each(function(i, elem) {
			amounts.push($(this).text().trim().replace(/,/g, '').split('$')[1]);
		});
	},
	pledges_data: function(html) {
		var $ = cheerio.load(html),
		pledgeJSON = {},
		numPledges = $('.NS-projects-rightcol-rewards').attr('data-reward-count');
		for(var i = 0; i < numPledges; i++) {
			var tempJSON = {};
			tempJSON['amount'] = $('.NS-projects-rightcol-rewards h5 span').eq(i).text().trim().replace(/,/g, '').split('$')[1];
			var numBackers = $('.NS-projects-rightcol-rewards .num-backers').eq(i).text().trim().split(' ')[0];
			tempJSON['num_backers'] = numBackers;
			var totalBackers = $('#backers_count').attr('data-backers-count');
			tempJSON['pledge_percentage'] = (parseFloat(numBackers/totalBackers)*100).toFixed(2);
			tempJSON['delivery_month'] = $('.delivery-date').eq(i).text().replace(/\n/g, '').split(':')[1].split(' ')[0];
			tempJSON['delivery_year'] = $('.delivery-date').eq(i).text().replace(/\n/g, '').split(':')[1].split(' ')[1];
			var all_words = $('.NS-projects-rightcol-rewards .small_type').eq(i).text().split(' ');
			tempJSON['num_words'] = all_words.length;
			tempJSON['words'] = all_words;
			tempJSON['num_all_caps'] = utils.fetchNumAllCaps(all_words);
			tempJSON['all_cap_words'] = utils.fetchAllCapWords(all_words).toString();
			$('.limited-number').each(function(i, elem) {
				var thingy = $(this).text().replace(/\(|\)|/g, '').split(' ');
				var left = thingy[0];
				var total = thingy[3];
				var sold = total - left;
				tempJSON['sold'] = sold;
				tempJSON['total'] = total;
			})
			pledgeJSON[i] = tempJSON
		}		
		return pledgeJSON
	}
}

Project.prototype.getTitle = function(callback) {
	this.fields.enqueue('general_title');
	if(callback === undefined) return this;
	else this.request(callback);
}

Project.prototype.getCreator = function(callback) {
	this.fields.enqueue('general_creator');
	if(callback === undefined) return this;
	else this.request(callback);
}

Project.prototype.getParentCategory = function(callback) {
	this.fields.enqueue('general_parentCategory');
	if(callback === undefined) return this;
	else this.request(callback);
}

Project.prototype.getSubCategory = function(callback) {
	this.fields.enqueue('general_subCategory');
	if(callback === undefined) return this;
	else this.request(callback);
}

Project.prototype.getAvatar = function(callback) {
	this.fields.enqueue('general_avatar');
	if(callback === undefined) return this;
	else this.request(callback);
}

Project.prototype.getProjectUrl = function(callback) {
	this.fields.enqueue('general_projectUrl');
	if(callback === undefined) return this;
	else this.request(callback);
}

Project.prototype.getCreatorUrl = function(callback) {
	this.fields.enqueue('general_creatorUrl');
	if(callback === undefined) return this;
	else this.request(callback);
}

Project.prototype.getProjectVideo = function(callback) {
	this.fields.enqueue('general_projectVideo');
	if(callback === undefined) return this;
	else this.request(callback);
}

Project.prototype.getCity = function(callback) {
	this.fields.enqueue('location_city');
	if(callback === undefined) return this;
	else this.request(callback);
}

Project.prototype.getState = function(callback) {
	this.fields.enqueue('location_state');
	if(callback === undefined) return this;
	else this.request(callback);
}

Project.prototype.getCountry = function(callback) {
	this.fields.enqueue('location_country');
	if(callback === undefined) return this;
	else this.request(callback);
}

Project.prototype.getDollarsRaised = function(callback) {
	this.fields.enqueue('funding_dollarsRaised');
	if(callback === undefined) return this;
	else this.request(callback);
}

Project.prototype.getFunding = function(callback) {
	this.fields.enqueue('funding_fundingGoal');
	if(callback === undefined) return this;
	else this.request(callback);
}

Project.prototype.getPercentRaised = function(callback) {
	this.fields.enqueue('funding_percentRaised');
	if(callback === undefined) return this;
	else this.request(callback);
}

Project.prototype.getCurrency = function(callback) {
	this.fields.enqueue('funding_currency');
	if(callback === undefined) return this;
	else this.request(callback);
}

Project.prototype.getSuccess = function(callback) {
	this.fields.enqueue('funding_successful');
	if(callback === undefined) return this;
	else this.request(callback);
}

Project.prototype.getBackers = function(callback) {
	this.fields.enqueue('funding_backers');
	if(callback === undefined) return this;
	else this.request(callback);
}

Project.prototype.getDuration = function(callback) {
	this.fields.enqueue('time_days');
	if(callback === undefined) return this;
	else this.request(callback);
}

Project.prototype.getStartTime = function(callback) {
	this.fields.enqueue('time_start');
	if(callback === undefined) return this;
	else this.request(callback);
}

Project.prototype.getEndTime = function(callback) {
	this.fields.enqueue('time_end');
	if(callback === undefined) return this;
	else this.request(callback);
}

Project.prototype.getFacebookConnected = function(callback) {
	this.fields.enqueue('facebook_connected');
	if(callback === undefined) return this;
	else this.request(callback);
}

Project.prototype.getFacebookName = function(callback) {
	this.fields.enqueue('facebook_name');
	if(callback === undefined) return this;
	else this.request(callback);
}

Project.prototype.getFacebookLink = function(callback) {
	this.fields.enqueue('facebook_link');
	if(callback === undefined) return this;
	else this.request(callback);
}

Project.prototype.getNumFacebookFriends = function(callback) {
	this.fields.enqueue('facebook_numFriends');
	if(callback === undefined) return this;
	else this.request(callback);
}

Project.prototype.getNumUpdates = function(callback) {
	this.fields.enqueue('other_updates');
	if(callback === undefined) return this;
	else this.request(callback);
}

Project.prototype.getNumComments = function(callback) {
	this.fields.enqueue('other_comments');
	if(callback === undefined) return this;
	else this.request(callback);
}

Project.prototype.getNumProjectsCreated = function(callback) {
	this.fields.enqueue('other_projectsCreated');
	if(callback === undefined) return this;
	else this.request(callback);
}

Project.prototype.getNumProjectsBacked = function(callback) {
	this.fields.enqueue('other_projectsBacked');
	if(callback === undefined) return this;
	else this.request(callback);
}

Project.prototype.getWebsiteLink = function(callback) {
	this.fields.enqueue('other_websiteLink');
	if(callback === undefined) return this;
	else this.request(callback);
}

Project.prototype.getWebsiteName = function(callback) {
	this.fields.enqueue('other_websiteName');
	if(callback === undefined) return this;
	else this.request(callback);
}

Project.prototype.getNumPictures = function(callback) {
	this.fields.enqueue('media_numPictures');
	if(callback === undefined) return this;
	else this.request(callback);
}

Project.prototype.getPictures = function(callback) {
	this.fields.enqueue('media_pictures');
	if(callback === undefined) return this;
	else this.request(callback);
}

Project.prototype.getNumPledges = function(callback) {
	this.fields.enqueue('pledges_number');
	if(callback === undefined) return this;
	else this.request(callback);
}

Project.prototype.limitedPledges = function(callback) {
	this.fields.enqueue('pledges_limited');
	if(callback === undefined) return this;
	else this.request(callback);
}

Project.prototype.getNumSoldOut = function(callback) {
	this.fields.enqueue('pledges_soldOut');
	if(callback === undefined) return this;
	else this.request(callback);
}

Project.prototype.getPercentLimited = function(callback) {
	this.fields.enqueue('pledges_percentLimited');
	if(callback === undefined) return this;
	else this.request(callback);
}

Project.prototype.getPercentSoldOut = function(callback) {
	this.fields.enqueue('pledges_percentSoldOut');
	if(callback === undefined) return this;
	else this.request(callback);
}

Project.prototype.getPledgeAmounts = function(callback) {
	this.fields.enqueue('pledges_amounts');
	if(callback === undefined) return this;
	else this.request(callback);
}

Project.prototype.getPledgesData = function(callback) {
	this.fields.enqueue('pledges_data');
	if(callback === undefined) return this;
	else this.request(callback);
}

Project.prototype.request = function(callback) {
	var project = this;
	if(project.fields.size === 0) {
		callback('no fields request', undefined);
	} else {
		request(project.url, function(err, res, body) {
			if(!err) {
				var successes = {}, 
				errors = {},
				i = project.fields.size();
				while(i--) {
					var data = project.fields.dequeue();
					if(data_points[data] != undefined) {
						try {
							successes[data] = data_points[data](body)
						} catch(e) {
							successes[data] = undefined;
							errors[data] = e;
						}
						
					} else {
						successes[data] = undefined;
						errors[data] = 'not a valid datapoint';
					}
				}
				// if errors json has no key-val pairs -> success
				if(Object.keys(errors).length === 0) {
					if(log) toColors(successes);
					else callback(undefined, successes);	
				} else {
					if(log) toColors(successes);
					else callback(errors, successes);
				}
			} else callback(err, undefined);
		});
	}
}

function toColors(data) {
	for(var i in data) {
		var prefix = i.split('_')[0]
		switch(prefix) {
			case 'general':
				console.log(i['magenta']['blackBG']+' '+String(data[i])['magenta']);
				break;
			case 'location':
				console.log(i['cyan']['blackBG']+' '+String(data[i])['cyan'])
				break
			case 'funding':
				console.log(i['green']['blackBG']+' '+String(data[i])['green'])
				break
			case 'time':
				console.log(i['yellow']['blackBG']+' '+String(data[i])['yellow'])
				break;
			case 'other':
				console.log(i['red']['blackBG']+' '+String(data[i])['red']);
				break;
			case 'media':
				console.log(i['white']['blackBG']+' '+String(data[i])['white']);
				break;
			case 'pledges':
				console.log(i['cyan']['blackBG']+' '+String(data[i])['cyan']);
				break;
		}
	}
}