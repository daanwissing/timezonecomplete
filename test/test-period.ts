﻿/// <reference path="../typings/test.d.ts" />

import assert = require("assert");
import chai = require("chai");
import expect = chai.expect;

import datetimeFuncs = require("../lib/index");

import DateTime = datetimeFuncs.DateTime;
import Period = datetimeFuncs.Period;
import PeriodDst = datetimeFuncs.PeriodDst;
import TimeSource = datetimeFuncs.TimeSource;
import TimeUnit = datetimeFuncs.TimeUnit;
import TimeZone = datetimeFuncs.TimeZone;

// Fake time source
class TestTimeSource implements TimeSource {
	public currentTime: Date = new Date("2014-01-03T04:05:06.007Z");

	now(): Date {
		return this.currentTime;
	}
}

// Insert fake time source so that now() is stable
var testTimeSource: TestTimeSource = new TestTimeSource();
DateTime.timeSource = testTimeSource;


describe("Period", (): void => {

	describe("start()", (): void => {
		expect((new Period(new DateTime("2014-01-31T12:00:00.000 UTC"), 2, TimeUnit.Month, PeriodDst.RegularIntervals))
			.start().toString())
			.to.equal("2014-01-31T12:00:00.000 UTC");
	});

	describe("amount()", (): void => {
		expect((new Period(new DateTime("2014-01-31T12:00:00.000 UTC"), 2, TimeUnit.Month, PeriodDst.RegularIntervals))
			.amount())
			.to.equal(2);
	});

	describe("unit()", (): void => {
		expect((new Period(new DateTime("2014-01-31T12:00:00.000 UTC"), 2, TimeUnit.Month, PeriodDst.RegularIntervals))
			.unit())
			.to.equal(TimeUnit.Month);
	});

	describe("dst()", (): void => {
		expect((new Period(new DateTime("2014-01-31T12:00:00.000 UTC"), 2, TimeUnit.Month, PeriodDst.RegularIntervals))
			.dst())
			.to.equal(PeriodDst.RegularIntervals);
	});

	describe("next(<=start)", (): void => {
		it("should return start date in fromDate zone", (): void => {
			expect((new Period(new DateTime("2014-01-01T12:00:00.000 UTC"), 2, TimeUnit.Month, PeriodDst.RegularIntervals))
				.findFirst(new DateTime("2013-01-01T12:00:00.00+02")).toString())
				.to.equal("2014-01-01T14:00:00.000+02:00");
		});
		it("should work for 400-year leap year", (): void => {
			expect((new Period(new DateTime("2000-02-29T12:00:00.000 UTC"), 1, TimeUnit.Year, PeriodDst.RegularIntervals))
				.findFirst(new DateTime("1999-12-31T12:00:00 UTC")).toString())
				.to.equal("2000-02-29T12:00:00.000 UTC");
		});
		it("should NOT return start date for the start date itself", (): void => {
			expect((new Period(new DateTime("2014-01-01T12:00:00.000 UTC"), 2, TimeUnit.Month, PeriodDst.RegularIntervals))
				.findFirst(new DateTime("2014-01-01T14:00:00.00+02")).toString())
				.to.equal("2014-03-01T14:00:00.000+02:00");
		});
	});

	describe("Period(X, 1, X, RegularInterval).findFirst()", (): void => {
		it("should handle 1 Second", (): void => {
			expect((new Period(new DateTime("1970-01-01T12:00:00 Europe/Amsterdam"), 1, TimeUnit.Second, PeriodDst.RegularIntervals))
				.findFirst(new DateTime("2014-03-30T01:59:59.000 Europe/Amsterdam")).toString())
				.to.equal("2014-03-30T03:00:00.000 Europe/Amsterdam");

			// note the target time is 2AM during DST backward, so 2AM exists twice.
			// Because we want to increase utc time, we expect to go from the FIRST 02:59:59 to 02:00:00
			expect((new Period(new DateTime("1970-01-01T12:00:00 Europe/Amsterdam"), 1, TimeUnit.Second, PeriodDst.RegularIntervals))
				.findFirst(new DateTime("2014-10-26T00:59:59.000 UTC")).toString())
				.to.equal("2014-10-26T01:00:00.000 UTC");
		});
		it("should handle 1 Minute", (): void => {
			expect((new Period(new DateTime("1970-01-01T12:00:00 Europe/Amsterdam"), 1, TimeUnit.Minute, PeriodDst.RegularIntervals))
				.findFirst(new DateTime("2014-03-30T01:59:59.000 UTC")).toString())
				.to.equal("2014-03-30T02:00:00.000 UTC");
		});
		it("should handle 1 Hour", (): void => {
			// check around dst
			expect((new Period(new DateTime("1970-01-01T12:05:06.007 Europe/Amsterdam"), 1, TimeUnit.Hour, PeriodDst.RegularIntervals))
				.findFirst(new DateTime("2014-10-26T00:10:00.000 UTC")).toString())
				.to.equal("2014-10-26T01:05:06.007 UTC");
			// check it returns OK in local time (which stays from 2AM at 2AM)
			expect((new Period(new DateTime("1970-01-01T12:05:06.007 Europe/Amsterdam"), 1, TimeUnit.Hour, PeriodDst.RegularIntervals))
				.findFirst(new DateTime("2014-10-26T00:10:00.000 UTC").toZone(TimeZone.zone("Europe/Amsterdam"))).toString())
				.to.equal("2014-10-26T02:05:06.007 Europe/Amsterdam");
		});
		it("should handle 1 Hour in zone with DST !== 1h", (): void => {
			// Ghana had DST of 20 minutes
			expect((new Period(new DateTime("1930-01-01T12:05:06.007 Africa/Accra"), 1, TimeUnit.Hour, PeriodDst.RegularIntervals))
				.findFirst(new DateTime("1937-10-26T00:10:00.000 Africa/Accra")).toString())
				.to.equal("1937-10-26T00:25:06.007 Africa/Accra");
		});
		it("should handle 1 Day", (): void => {
			// check it shifts local time from 12h to 13h
			expect((new Period(new DateTime("1970-01-01T12:05:06.007 Europe/Amsterdam"), 1, TimeUnit.Day, PeriodDst.RegularIntervals))
				.findFirst(new DateTime("2014-03-30T00:00:00.000 Europe/Amsterdam")).toString())
				.to.equal("2014-03-30T13:05:06.007 Europe/Amsterdam");
			// check it returns greater time for boundary fromdate
			expect((new Period(new DateTime("1970-01-01T12:05:06.007 Europe/Amsterdam"), 1, TimeUnit.Day, PeriodDst.RegularIntervals))
				.findFirst(new DateTime("2014-01-01T12:05:06.007 Europe/Amsterdam")).toString())
				.to.equal("2014-01-02T12:05:06.007 Europe/Amsterdam");
		});
		it("should handle 1 Month", (): void => {
			// check it shifts local time from 12h to 13h
			expect((new Period(new DateTime("1970-01-01T12:05:06.007 Europe/Amsterdam"), 1, TimeUnit.Month, PeriodDst.RegularIntervals))
				.findFirst(new DateTime("2014-03-28T00:00:00.000 Europe/Amsterdam")).toString())
				.to.equal("2014-04-01T13:05:06.007 Europe/Amsterdam");
			// check it returns greater time for boundary fromdate
			expect((new Period(new DateTime("1970-01-01T12:05:06.007 Europe/Amsterdam"), 1, TimeUnit.Month, PeriodDst.RegularIntervals))
				.findFirst(new DateTime("2014-01-01T12:05:06.007 Europe/Amsterdam")).toString())
				.to.equal("2014-02-01T12:05:06.007 Europe/Amsterdam");
		});
		it("should handle 1 Year", (): void => {
			// check it shifts local time (note in 2015 dst change is earlier)
			expect((new Period(new DateTime("2014-03-29T04:00:00.007 Europe/Amsterdam"), 1, TimeUnit.Year, PeriodDst.RegularIntervals))
				.findFirst(new DateTime("2014-04-01T00:00:00.000 Europe/Amsterdam")).toString())
				.to.equal("2015-03-29T05:00:00.007 Europe/Amsterdam");
			// check it returns greater time for boundary fromdate
			expect((new Period(new DateTime("1970-01-01T12:05:06.007 Europe/Amsterdam"), 1, TimeUnit.Year, PeriodDst.RegularIntervals))
				.findFirst(new DateTime("2014-01-01T12:05:06.007 Europe/Amsterdam")).toString())
				.to.equal("2015-01-01T12:05:06.007 Europe/Amsterdam");
		});
	});

	describe("Period(X, 1, X, RegularLocalTime).findFirst()", (): void => {
		it("should handle 1 Second", (): void => {
			// note the target time is 2AM during DST backward, so 2AM exists twice.
			// Because we want to increase local time, we expect to go from the FIRST 02:59:59 to 03:00:00, skippint the second 02:00:00
			expect((new Period(new DateTime("1970-01-01T12:00:00 Europe/Amsterdam"), 1, TimeUnit.Second, PeriodDst.RegularLocalTime))
				.findFirst(new DateTime("2014-10-26T00:59:59.000 UTC")).toString())
				.to.equal("2014-10-26T02:00:00.000 UTC");
		});
		it("should handle 1 Minute", (): void => {
			expect((new Period(new DateTime("1970-01-01T12:00:00 Europe/Amsterdam"), 1, TimeUnit.Minute, PeriodDst.RegularLocalTime))
				.findFirst(new DateTime("2014-10-26T00:59:00.000 UTC")).toString())
				.to.equal("2014-10-26T02:00:00.000 UTC");
		});
		it("should handle 1 Hour", (): void => {
			// check around dst
			expect((new Period(new DateTime("1970-01-01T12:00:00 Europe/Amsterdam"), 1, TimeUnit.Hour, PeriodDst.RegularLocalTime))
				.findFirst(new DateTime("2014-10-26T00:00:00.000 UTC")).toString())
				.to.equal("2014-10-26T02:00:00.000 UTC");
			// check it returns OK in local time (which changes from 2AM to 3AM)
			expect((new Period(new DateTime("1970-01-01T12:00:00 Europe/Amsterdam"), 1, TimeUnit.Hour, PeriodDst.RegularLocalTime))
				.findFirst(new DateTime("2014-10-26T00:00:00.000 UTC").toZone(TimeZone.zone("Europe/Amsterdam"))).toString())
				.to.equal("2014-10-26T03:00:00.000 Europe/Amsterdam");
		});
		it("should handle 1 Hour in zone with DST !== 1h", (): void => {
			// Ghana had DST of 20 minutes
			expect((new Period(new DateTime("1930-01-01T12:05:06.007 Africa/Accra"), 1, TimeUnit.Hour, PeriodDst.RegularLocalTime))
				.findFirst(new DateTime("1937-10-26T00:10:00.000 Africa/Accra")).toString())
				.to.equal("1937-10-26T01:05:06.007 Africa/Accra");
		});
		it("should handle 1 Day", (): void => {
			// check it keeps local time @ 12h
			expect((new Period(new DateTime("1970-01-01T12:05:06.007 Europe/Amsterdam"), 1, TimeUnit.Day, PeriodDst.RegularLocalTime))
				.findFirst(new DateTime("2014-03-30T00:00:00.000 Europe/Amsterdam")).toString())
				.to.equal("2014-03-30T12:05:06.007 Europe/Amsterdam");
			// check it returns greater time for boundary fromdate
			expect((new Period(new DateTime("1970-01-01T12:05:06.007 Europe/Amsterdam"), 1, TimeUnit.Day, PeriodDst.RegularLocalTime))
				.findFirst(new DateTime("2014-01-01T12:05:06.007 Europe/Amsterdam")).toString())
				.to.equal("2014-01-02T12:05:06.007 Europe/Amsterdam");
		});
		it("should handle 1 Month", (): void => {
			// check it keeps local time @ 12h
			expect((new Period(new DateTime("1970-01-01T12:05:06.007 Europe/Amsterdam"), 1, TimeUnit.Month, PeriodDst.RegularLocalTime))
				.findFirst(new DateTime("2014-03-28T00:00:00.000 Europe/Amsterdam")).toString())
				.to.equal("2014-04-01T12:05:06.007 Europe/Amsterdam");
			// check it returns greater time for boundary fromdate
			expect((new Period(new DateTime("1970-01-01T12:05:06.007 Europe/Amsterdam"), 1, TimeUnit.Month, PeriodDst.RegularLocalTime))
				.findFirst(new DateTime("2014-01-01T12:05:06.007 Europe/Amsterdam")).toString())
				.to.equal("2014-02-01T12:05:06.007 Europe/Amsterdam");
		});
		it("should handle 1 Year", (): void => {
			// check it keeps local time (note in 2015 dst change is earlier)
			expect((new Period(new DateTime("2014-03-29T04:00:00.007 Europe/Amsterdam"), 1, TimeUnit.Year, PeriodDst.RegularLocalTime))
				.findFirst(new DateTime("2014-04-01T00:00:00.000 Europe/Amsterdam")).toString())
				.to.equal("2015-03-29T04:00:00.007 Europe/Amsterdam");
			// check it returns greater time for boundary fromdate
			expect((new Period(new DateTime("1970-01-01T12:05:06.007 Europe/Amsterdam"), 1, TimeUnit.Year, PeriodDst.RegularLocalTime))
				.findFirst(new DateTime("2014-01-01T12:05:06.007 Europe/Amsterdam")).toString())
				.to.equal("2015-01-01T12:05:06.007 Europe/Amsterdam");
		});
	});

	describe("Period(X, 2, X, RegularInterval).findFirst()", (): void => {
		it("should handle 2 Second", (): void => {
			expect((new Period(new DateTime("1970-01-01T12:00:00 Europe/Amsterdam"), 2, TimeUnit.Second, PeriodDst.RegularIntervals))
				.findFirst(new DateTime("2014-03-30T01:59:58.000 Europe/Amsterdam")).toString())
				.to.equal("2014-03-30T03:00:00.000 Europe/Amsterdam");

			// note the target time is 2AM during DST backward, so 2AM exists twice.
			// Because we want to increase utc time, we expect to go from the FIRST 02:59:59 to 02:00:00
			expect((new Period(new DateTime("1970-01-01T12:00:00 Europe/Amsterdam"), 2, TimeUnit.Second, PeriodDst.RegularIntervals))
				.findFirst(new DateTime("2014-10-26T00:59:58.000 UTC")).toString())
				.to.equal("2014-10-26T01:00:00.000 UTC");
		});
		it("should handle 2 Minute", (): void => {
			expect((new Period(new DateTime("1970-01-01T12:00:00 Europe/Amsterdam"), 2, TimeUnit.Minute, PeriodDst.RegularIntervals))
				.findFirst(new DateTime("2014-03-30T01:58:00.000 UTC")).toString())
				.to.equal("2014-03-30T02:00:00.000 UTC");
		});
		it("should handle 2 Hour", (): void => {
			// check around dst
			expect((new Period(new DateTime("1970-01-01T12:05:06.007 Europe/Amsterdam"), 2, TimeUnit.Hour, PeriodDst.RegularIntervals))
				.findFirst(new DateTime("2014-10-26T00:10:00.000 UTC")).toString())
				.to.equal("2014-10-26T01:05:06.007 UTC"); // note 1AM because start time is 11AM UTC
			// check it returns OK in local time (which stays from 2AM at 2AM)
			expect((new Period(new DateTime("1970-01-01T01:00:00.000 Europe/Amsterdam"), 2, TimeUnit.Hour, PeriodDst.RegularIntervals))
				.findFirst(new DateTime("2014-10-25T23:10:00.000 UTC").toZone(TimeZone.zone("Europe/Amsterdam"))).toString())
				.to.equal("2014-10-26T02:00:00.000 Europe/Amsterdam");
		});
		it("should handle 2 Hour in zone with DST !== 1h", (): void => {
			// Ghana had DST of 20 minutes
			expect((new Period(new DateTime("1930-01-01T12:05:06.007 Africa/Accra"), 2, TimeUnit.Hour, PeriodDst.RegularIntervals))
				.findFirst(new DateTime("1937-10-26T00:10:00.000 Africa/Accra")).toString())
				.to.equal("1937-10-26T00:25:06.007 Africa/Accra");
		});
		it("should handle 2 Day", (): void => {
			// check it shifts local time from 12h to 13h
			expect((new Period(new DateTime("1970-01-01T12:05:06.007 Europe/Amsterdam"), 2, TimeUnit.Day, PeriodDst.RegularIntervals))
				.findFirst(new DateTime("2014-03-30T00:00:00.000 Europe/Amsterdam")).toString())
				.to.equal("2014-03-31T13:05:06.007 Europe/Amsterdam");
			// check it returns greater time for boundary fromdate
			expect((new Period(new DateTime("1970-01-01T12:05:06.007 Europe/Amsterdam"), 2, TimeUnit.Day, PeriodDst.RegularIntervals))
				.findFirst(new DateTime("2014-01-02T12:05:06.007 Europe/Amsterdam")).toString())
				.to.equal("2014-01-04T12:05:06.007 Europe/Amsterdam");
		});
		it("should handle 1 Week", (): void => {
			// check it shifts local time from 12h to 13h
			expect((new Period(new DateTime("1970-01-01T12:05:06.007 Europe/Amsterdam"), 1, TimeUnit.Week, PeriodDst.RegularIntervals))
				.findFirst(new DateTime("2014-03-30T00:00:00.000 Europe/Amsterdam")).toString())
				.to.equal("2014-04-03T13:05:06.007 Europe/Amsterdam");
			// check it returns greater time for boundary fromdate
			expect((new Period(new DateTime("1970-01-01T12:05:06.007 Europe/Amsterdam"), 1, TimeUnit.Week, PeriodDst.RegularIntervals))
				.findFirst(new DateTime("2014-01-02T12:05:06.007 Europe/Amsterdam")).toString())
				.to.equal("2014-01-09T12:05:06.007 Europe/Amsterdam");
		});
		it("should handle 2 Month", (): void => {
			// check it shifts local time from 12h to 13h
			expect((new Period(new DateTime("1970-01-01T12:05:06.007 Europe/Amsterdam"), 2, TimeUnit.Month, PeriodDst.RegularIntervals))
				.findFirst(new DateTime("2014-03-28T00:00:00.000 Europe/Amsterdam")).toString())
				.to.equal("2014-05-01T13:05:06.007 Europe/Amsterdam");
			// check it returns greater time for boundary fromdate
			expect((new Period(new DateTime("1970-01-01T12:05:06.007 Europe/Amsterdam"), 2, TimeUnit.Month, PeriodDst.RegularIntervals))
				.findFirst(new DateTime("2014-01-01T12:05:06.007 Europe/Amsterdam")).toString())
				.to.equal("2014-03-01T12:05:06.007 Europe/Amsterdam");
		});
		it("should handle 2 Year", (): void => {
			// check it shifts local time (note in 2015 dst change is earlier)
			expect((new Period(new DateTime("2014-03-29T04:00:00.007 Europe/Amsterdam"), 2, TimeUnit.Year, PeriodDst.RegularIntervals))
				.findFirst(new DateTime("2014-04-01T00:00:00.000 Europe/Amsterdam")).toString())
				.to.equal("2016-03-29T05:00:00.007 Europe/Amsterdam");
			// check it returns greater time for boundary fromdate
			expect((new Period(new DateTime("1970-01-01T12:05:06.007 Europe/Amsterdam"), 2, TimeUnit.Year, PeriodDst.RegularIntervals))
				.findFirst(new DateTime("2014-01-01T12:05:06.007 Europe/Amsterdam")).toString())
				.to.equal("2016-01-01T12:05:06.007 Europe/Amsterdam");
		});
	});

	describe("Period(X, 2, X, RegularLocalTime).findFirst()", (): void => {
		it("should handle 2 Second", (): void => {
			// note the target time is 2AM during DST backward, so 2AM exists twice.
			// Because we want to increase local time, we expect to go from the FIRST 02:59:59 to 03:00:00, skippint the second 02:00:00
			expect((new Period(new DateTime("1970-01-01T12:00:00 Europe/Amsterdam"), 2, TimeUnit.Second, PeriodDst.RegularLocalTime))
				.findFirst(new DateTime("2014-10-26T00:59:58.000 UTC")).toString())
				.to.equal("2014-10-26T02:00:00.000 UTC");
		});
		it("should handle 2 Minute", (): void => {
			expect((new Period(new DateTime("1970-01-01T12:00:00 Europe/Amsterdam"), 2, TimeUnit.Minute, PeriodDst.RegularLocalTime))
				.findFirst(new DateTime("2014-10-26T00:58:00.000 UTC")).toString())
				.to.equal("2014-10-26T02:00:00.000 UTC");
		});
		it("should handle 2 Hour", (): void => {
			// check around dst - because local time is kept in rythm, UTC time varies in hours
			expect((new Period(new DateTime("1970-01-01T11:00:00 Europe/Amsterdam"), 2, TimeUnit.Hour, PeriodDst.RegularLocalTime))
				.findFirst(new DateTime("2014-10-25T23:00:00.000 UTC")).toString())
				.to.equal("2014-10-26T02:00:00.000 UTC");
			expect((new Period(new DateTime("1970-01-01T12:00:00 Europe/Amsterdam"), 2, TimeUnit.Hour, PeriodDst.RegularLocalTime))
				.findFirst(new DateTime("2014-10-26T00:00:00.000 UTC")).toString())
				.to.equal("2014-10-26T03:00:00.000 UTC");
			expect((new Period(new DateTime("1970-01-01T12:00:00 Europe/Amsterdam"), 2, TimeUnit.Hour, PeriodDst.RegularLocalTime))
				.findFirst(new DateTime("2014-10-26T01:00:00.000 UTC")).toString())
				.to.equal("2014-10-26T03:00:00.000 UTC");
			// check it returns OK in local time (which changes from 2AM to 3AM)
			expect((new Period(new DateTime("1970-01-01T12:00:00 Europe/Amsterdam"), 2, TimeUnit.Hour, PeriodDst.RegularLocalTime))
				.findFirst(new DateTime("2014-10-26T00:00:00.000 UTC").toZone(TimeZone.zone("Europe/Amsterdam"))).toString())
				.to.equal("2014-10-26T04:00:00.000 Europe/Amsterdam");
		});
		it("should handle 2 Hour in zone with DST !== 1h", (): void => {
			// Ghana had DST of 20 minutes
			expect((new Period(new DateTime("1930-01-01T12:05:06.007 Africa/Accra"), 2, TimeUnit.Hour, PeriodDst.RegularLocalTime))
				.findFirst(new DateTime("1937-10-26T00:10:00.000 Africa/Accra")).toString())
				.to.equal("1937-10-26T02:05:06.007 Africa/Accra");
		});
		it("should handle 2 Day", (): void => {
			// check it keeps local time @ 12h across DST
			expect((new Period(new DateTime("2014-03-26T12:00:00.000 Europe/Amsterdam"), 2, TimeUnit.Day, PeriodDst.RegularLocalTime))
				.findFirst(new DateTime("2014-03-29T12:00:00.000 Europe/Amsterdam")).toString())
				.to.equal("2014-03-30T12:00:00.000 Europe/Amsterdam");
			// check it returns greater time for boundary fromdate
			expect((new Period(new DateTime("2014-03-26T12:05:06.007 Europe/Amsterdam"), 2, TimeUnit.Day, PeriodDst.RegularLocalTime))
				.findFirst(new DateTime("2014-03-28T12:05:06.007 Europe/Amsterdam")).toString())
				.to.equal("2014-03-30T12:05:06.007 Europe/Amsterdam");
		});
		it("should handle 2 Month", (): void => {
			// check it keeps local time @ 12h
			expect((new Period(new DateTime("1970-01-01T12:05:06.007 Europe/Amsterdam"), 2, TimeUnit.Month, PeriodDst.RegularLocalTime))
				.findFirst(new DateTime("2014-02-28T00:00:00.000 Europe/Amsterdam")).toString())
				.to.equal("2014-03-01T12:05:06.007 Europe/Amsterdam");
			// check it returns greater time for boundary fromdate
			expect((new Period(new DateTime("1970-01-01T12:05:06.007 Europe/Amsterdam"), 2, TimeUnit.Month, PeriodDst.RegularLocalTime))
				.findFirst(new DateTime("2014-01-01T12:05:06.007 Europe/Amsterdam")).toString())
				.to.equal("2014-03-01T12:05:06.007 Europe/Amsterdam");
		});
		it("should handle 2 Year", (): void => {
			// check it keeps local time (note in 2015 dst change is earlier)
			expect((new Period(new DateTime("2014-03-29T04:00:00.007 Europe/Amsterdam"), 2, TimeUnit.Year, PeriodDst.RegularLocalTime))
				.findFirst(new DateTime("2013-04-01T00:00:00.000 Europe/Amsterdam")).toString())
				.to.equal("2014-03-29T04:00:00.007 Europe/Amsterdam");
			// check it returns greater time for boundary fromdate
			expect((new Period(new DateTime("1970-01-01T12:05:06.007 Europe/Amsterdam"), 2, TimeUnit.Year, PeriodDst.RegularLocalTime))
				.findFirst(new DateTime("2014-01-01T12:05:06.007 Europe/Amsterdam")).toString())
				.to.equal("2016-01-01T12:05:06.007 Europe/Amsterdam");
		});
	});

	describe("Period(X, >X, X, RegularInterval).findFirst()", (): void => {
		it("should handle >60 Second", (): void => {
			// check that twice a unit works
			expect((new Period(new DateTime("2014-01-01T00:00:00.000 Europe/Amsterdam"), 120, TimeUnit.Second, PeriodDst.RegularIntervals))
				.findFirst(new DateTime("2014-01-01T00:00:00.000 Europe/Amsterdam")).toString())
				.to.equal("2014-01-01T00:02:00.000 Europe/Amsterdam");
			// check no effect on day boundary for non-factor of 24h
			expect((new Period(new DateTime("2014-01-01T00:00:00.000 Europe/Amsterdam"), 66, TimeUnit.Second, PeriodDst.RegularIntervals))
				.findFirst(new DateTime("2014-01-01T23:59:54.000 Europe/Amsterdam")).toString())
				.to.equal("2014-01-02T00:01:00.000 Europe/Amsterdam");
		});
		it("should handle >60 Minute", (): void => {
			// check that twice a unit works
			expect((new Period(new DateTime("2014-01-01T00:00:00.000 Europe/Amsterdam"), 120, TimeUnit.Minute, PeriodDst.RegularIntervals))
				.findFirst(new DateTime("2014-01-01T00:00:00.000 Europe/Amsterdam")).toString())
				.to.equal("2014-01-01T02:00:00.000 Europe/Amsterdam");
			// check no effect on day boundary for non-factor of 24h
			expect((new Period(new DateTime("2014-01-01T00:00:00.000 Europe/Amsterdam"), 66, TimeUnit.Minute, PeriodDst.RegularIntervals))
				.findFirst(new DateTime("2014-01-01T23:06:00.000 Europe/Amsterdam")).toString())
				.to.equal("2014-01-02T00:12:00.000 Europe/Amsterdam");
		});
		it("should handle >24 Hour", (): void => {
			// check that twice a unit works
			expect((new Period(new DateTime("2014-01-01T00:00:00.000 Europe/Amsterdam"), 48, TimeUnit.Hour, PeriodDst.RegularIntervals))
				.findFirst(new DateTime("2014-01-19T00:00:00.000 Europe/Amsterdam")).toString())
				.to.equal("2014-01-21T00:00:00.000 Europe/Amsterdam");
			// check that non-multiple of a unit works
			expect((new Period(new DateTime("2014-01-01T00:00:00.000 Europe/Amsterdam"), 25, TimeUnit.Hour, PeriodDst.RegularIntervals))
				.findFirst(new DateTime("2014-01-01T00:00:00.000 Europe/Amsterdam")).toString())
				.to.equal("2014-01-02T01:00:00.000 Europe/Amsterdam");
		});
		it("should handle >31 Day", (): void => {
			expect((new Period(new DateTime("2014-01-01T00:00:00.000 Europe/Amsterdam"), 40, TimeUnit.Day, PeriodDst.RegularIntervals))
				.findFirst(new DateTime("2014-01-20T00:00:00.000 Europe/Amsterdam")).toString())
				.to.equal("2014-02-10T00:00:00.000 Europe/Amsterdam");
		});
		it("should handle >53 Week", (): void => {
			expect((new Period(new DateTime("2014-01-01T00:00:00.000 Europe/Amsterdam"), 54, TimeUnit.Week, PeriodDst.RegularIntervals))
				.findFirst(new DateTime("2014-01-10T00:00:00.000 Europe/Amsterdam")).toString())
				.to.equal("2015-01-14T00:00:00.000 Europe/Amsterdam");
		});
		it("should handle >12 Month", (): void => {
			// non-leap year
			expect((new Period(new DateTime("2014-01-01T00:00:00.000 Europe/Amsterdam"), 13, TimeUnit.Month, PeriodDst.RegularIntervals))
				.findFirst(new DateTime("2014-01-10T00:00:00.000 Europe/Amsterdam")).toString())
				.to.equal("2015-02-01T00:00:00.000 Europe/Amsterdam");
			// leap year should not make a difference
			expect((new Period(new DateTime("2016-01-01T00:00:00.000 Europe/Amsterdam"), 13, TimeUnit.Month, PeriodDst.RegularIntervals))
				.findFirst(new DateTime("2016-01-10T00:00:00.000 Europe/Amsterdam")).toString())
				.to.equal("2017-02-01T00:00:00.000 Europe/Amsterdam");
		});
	});

	describe("Period(X, >X, X, RegularLocalTime).findFirst()", (): void => {
		it("should handle >60 Second", (): void => {
			// check that twice a unit works
			expect((new Period(new DateTime("2014-01-01T00:00:00.000 Europe/Amsterdam"), 120, TimeUnit.Second, PeriodDst.RegularLocalTime))
				.findFirst(new DateTime("2014-01-01T00:00:00.000 Europe/Amsterdam")).toString())
				.to.equal("2014-01-01T00:02:00.000 Europe/Amsterdam");
			// check reset on day boundary for non-factor of 24h
			expect((new Period(new DateTime("2014-01-01T00:00:00.000 Europe/Amsterdam"), 66, TimeUnit.Second, PeriodDst.RegularLocalTime))
				.findFirst(new DateTime("2014-01-01T23:59:54.000 Europe/Amsterdam")).toString())
				.to.equal("2014-01-02T00:00:00.000 Europe/Amsterdam");
			expect((new Period(new DateTime("2014-01-01T00:00:00.000 Europe/Amsterdam"), 66, TimeUnit.Second, PeriodDst.RegularLocalTime))
				.findFirst(new DateTime("2014-01-01T23:59:53.000 Europe/Amsterdam")).toString())
				.to.equal("2014-01-01T23:59:54.000 Europe/Amsterdam");
			expect((new Period(new DateTime("2014-01-01T12:00:00.000 Europe/Amsterdam"), 66, TimeUnit.Second, PeriodDst.RegularLocalTime))
				.findFirst(new DateTime("2014-02-02T11:59:53.000 Europe/Amsterdam")).toString())
				.to.equal("2014-02-02T11:59:54.000 Europe/Amsterdam");
		});
		it("should handle >60 Minute", (): void => {
			// check that twice a unit works
			expect((new Period(new DateTime("2014-01-01T00:00:00.000 Europe/Amsterdam"), 120, TimeUnit.Minute, PeriodDst.RegularLocalTime))
				.findFirst(new DateTime("2014-01-01T00:00:00.000 Europe/Amsterdam")).toString())
				.to.equal("2014-01-01T02:00:00.000 Europe/Amsterdam");
			// check reset on day boundary for non-factor of 24h
			expect((new Period(new DateTime("2014-01-01T00:00:00.000 Europe/Amsterdam"), 66, TimeUnit.Minute, PeriodDst.RegularLocalTime))
				.findFirst(new DateTime("2014-01-01T23:06:00.000 Europe/Amsterdam")).toString())
				.to.equal("2014-01-02T00:00:00.000 Europe/Amsterdam");
			expect((new Period(new DateTime("2014-01-01T00:00:00.000 Europe/Amsterdam"), 66, TimeUnit.Minute, PeriodDst.RegularLocalTime))
				.findFirst(new DateTime("2014-01-01T23:05:00.000 Europe/Amsterdam")).toString())
				.to.equal("2014-01-01T23:06:00.000 Europe/Amsterdam");
			expect((new Period(new DateTime("2014-01-01T12:00:00.000 Europe/Amsterdam"), 66, TimeUnit.Minute, PeriodDst.RegularLocalTime))
				.findFirst(new DateTime("2014-01-02T11:05:00.000 Europe/Amsterdam")).toString())
				.to.equal("2014-01-02T11:06:00.000 Europe/Amsterdam");
		});
		it("should handle >24 Hour", (): void => {
			// check that twice a unit works
			expect((new Period(new DateTime("2014-01-01T00:00:00.000 Europe/Amsterdam"), 48, TimeUnit.Hour, PeriodDst.RegularLocalTime))
				.findFirst(new DateTime("2014-01-19T00:00:00.000 Europe/Amsterdam")).toString())
				.to.equal("2014-01-21T00:00:00.000 Europe/Amsterdam");

			// check reset on day boundary for non-factor of 24h
			expect((new Period(new DateTime("2014-01-01T00:00:00.000 Europe/Amsterdam"), 5, TimeUnit.Hour, PeriodDst.RegularLocalTime))
				.findFirst(new DateTime("2014-01-01T20:00:00.000 Europe/Amsterdam")).toString())
				.to.equal("2014-01-02T00:00:00.000 Europe/Amsterdam");
			expect((new Period(new DateTime("2014-01-01T00:00:00.000 Europe/Amsterdam"), 5, TimeUnit.Hour, PeriodDst.RegularLocalTime))
				.findFirst(new DateTime("2014-01-01T19:00:00.000 Europe/Amsterdam")).toString())
				.to.equal("2014-01-01T20:00:00.000 Europe/Amsterdam");
			expect((new Period(new DateTime("2014-01-01T12:00:00.000 Europe/Amsterdam"), 5, TimeUnit.Hour, PeriodDst.RegularLocalTime))
				.findFirst(new DateTime("2014-01-02T07:00:00.000 Europe/Amsterdam")).toString())
				.to.equal("2014-01-02T08:00:00.000 Europe/Amsterdam");
		});
		it("should handle >31 Day", (): void => {
			expect((new Period(new DateTime("2014-01-01T00:00:00.000 Europe/Amsterdam"), 40, TimeUnit.Day, PeriodDst.RegularLocalTime))
				.findFirst(new DateTime("2014-01-20T00:00:00.000 Europe/Amsterdam")).toString())
				.to.equal("2014-02-10T00:00:00.000 Europe/Amsterdam");
		});
		it("should handle >53 Week", (): void => {
			expect((new Period(new DateTime("2014-01-01T00:00:00.000 Europe/Amsterdam"), 54, TimeUnit.Week, PeriodDst.RegularLocalTime))
				.findFirst(new DateTime("2014-01-10T00:00:00.000 Europe/Amsterdam")).toString())
				.to.equal("2015-01-14T00:00:00.000 Europe/Amsterdam");
		});
		it("should handle >12 Month", (): void => {
			// non-leap year
			expect((new Period(new DateTime("2014-01-01T00:00:00.000 Europe/Amsterdam"), 13, TimeUnit.Month, PeriodDst.RegularLocalTime))
				.findFirst(new DateTime("2014-01-10T00:00:00.000 Europe/Amsterdam")).toString())
				.to.equal("2015-02-01T00:00:00.000 Europe/Amsterdam");
			// multiple of 12 months
			expect((new Period(new DateTime("2014-01-01T00:00:00.000 Europe/Amsterdam"), 24, TimeUnit.Month, PeriodDst.RegularLocalTime))
				.findFirst(new DateTime("2014-01-10T00:00:00.000 Europe/Amsterdam")).toString())
				.to.equal("2016-01-01T00:00:00.000 Europe/Amsterdam");
			// leap year should not make a difference
			expect((new Period(new DateTime("2016-01-01T00:00:00.000 Europe/Amsterdam"), 13, TimeUnit.Month, PeriodDst.RegularLocalTime))
				.findFirst(new DateTime("2016-01-10T00:00:00.000 Europe/Amsterdam")).toString())
				.to.equal("2017-02-01T00:00:00.000 Europe/Amsterdam");
		});
	});

	describe("Period(RegularInterval).findNext()", (): void => {
		it("Should handle no count", (): void => {
			var p = new Period(new DateTime("2014-01-01T00:00:00 Europe/Amsterdam"), 1, TimeUnit.Hour, PeriodDst.RegularIntervals);
			expect(p.findNext(new DateTime("2014-02-01T01:00:00 Europe/Amsterdam")).toString())
				.to.equal("2014-02-01T02:00:00.000 Europe/Amsterdam");
		});
		it("Should handle count 1", (): void => {
			var p = new Period(new DateTime("2014-01-01T00:00:00 Europe/Amsterdam"), 1, TimeUnit.Hour, PeriodDst.RegularIntervals);
			expect(p.findNext(new DateTime("2014-02-01T01:00:00 Europe/Amsterdam"), 1).toString())
				.to.equal("2014-02-01T02:00:00.000 Europe/Amsterdam");
		});
		it("Should handle count >1", (): void => {
			var p = new Period(new DateTime("2014-01-01T00:00:00 Europe/Amsterdam"), 1, TimeUnit.Hour, PeriodDst.RegularIntervals);
			expect(p.findNext(new DateTime("2014-02-01T01:00:00 Europe/Amsterdam"), 10).toString())
				.to.equal("2014-02-01T11:00:00.000 Europe/Amsterdam");
		});
		it("Should return same zone as parameter", (): void => {
			var p = new Period(new DateTime("2014-01-01T00:00:00 Europe/Amsterdam"), 1, TimeUnit.Hour, PeriodDst.RegularIntervals);
			expect(p.findNext(new DateTime("2014-02-01T01:00:00 UTC"), 10).toString()).to.equal("2014-02-01T11:00:00.000 UTC");
		});
		it("Should not handle DST", (): void => {
			var p = new Period(new DateTime("2014-01-01T00:00:00 Europe/Amsterdam"), 1, TimeUnit.Hour, PeriodDst.RegularIntervals);
			expect(p.findNext(new DateTime("2014-10-26T00:00:00 UTC")).toString()).to.equal("2014-10-26T01:00:00.000 UTC");
		});
		it("Should throw on null datetime", (): void => {
			var p = new Period(new DateTime("2014-01-01T00:00:00 Europe/Amsterdam"), 1, TimeUnit.Hour, PeriodDst.RegularIntervals);
			assert.throws(function (): void {
				p.findNext(null);
			});
		});
		it("Should throw on <1 count", (): void => {
			var p = new Period(new DateTime("2014-01-01T00:00:00 Europe/Amsterdam"), 1, TimeUnit.Hour, PeriodDst.RegularIntervals);
			assert.throws(function (): void {
				p.findNext(new DateTime("2014-01-01T00:00:00 Europe/Amsterdam"), 0);
			});
			assert.throws(function (): void {
				p.findNext(new DateTime("2014-01-01T00:00:00 Europe/Amsterdam"), -1);
			});
		});
		it("Should throw on non-integer count", (): void => {
			var p = new Period(new DateTime("2014-01-01T00:00:00 Europe/Amsterdam"), 1, TimeUnit.Hour, PeriodDst.RegularIntervals);
			assert.throws(function (): void {
				p.findNext(new DateTime("2014-01-01T00:00:00 Europe/Amsterdam"), 1.1);
			});
		});
		it("Should handle end-of-month for 28 < day < 31", (): void => {
			var p = new Period(new DateTime("2014-01-29T00:00:00 Europe/Amsterdam"), 1, TimeUnit.Month, PeriodDst.RegularIntervals);
			expect(p.findNext(new DateTime("2014-01-29T00:00:00 Europe/Amsterdam"), 1).toString())
				.to.equal("2014-02-28T00:00:00.000 Europe/Amsterdam");
			expect(p.findNext(new DateTime("2014-01-29T00:00:00 Europe/Amsterdam"), 2).toString())
				.to.equal("2014-03-29T00:00:00.000 Europe/Amsterdam");
			expect(p.findNext(new DateTime("2014-01-29T00:00:00 Europe/Amsterdam"), 25).toString())
				.to.equal("2016-02-29T00:00:00.000 Europe/Amsterdam");
		});
		it("Should handle end-of-month for day == 31", (): void => {
			var p = new Period(new DateTime("2014-01-31T00:00:00 Europe/Amsterdam"), 1, TimeUnit.Month, PeriodDst.RegularIntervals);
			expect(p.findNext(new DateTime("2014-01-31T00:00:00 Europe/Amsterdam"), 1).toString())
				.to.equal("2014-02-28T00:00:00.000 Europe/Amsterdam");
			expect(p.findNext(new DateTime("2014-01-31T00:00:00 Europe/Amsterdam"), 2).toString())
				.to.equal("2014-03-31T00:00:00.000 Europe/Amsterdam");
			expect(p.findNext(new DateTime("2014-01-31T00:00:00 Europe/Amsterdam"), 3).toString())
				.to.equal("2014-04-30T01:00:00.000 Europe/Amsterdam"); // note local time changes because RegularIntervals is set
			expect(p.findNext(new DateTime("2014-01-29T00:00:00 Europe/Amsterdam"), 25).toString())
				.to.equal("2016-02-29T00:00:00.000 Europe/Amsterdam");
		});
	});

	describe("Period(RegularLocalTime).findNext()", (): void => {
		it("Should handle DST", (): void => {
			var p = new Period(new DateTime("2014-01-01T00:00:00 Europe/Amsterdam"), 1, TimeUnit.Hour, PeriodDst.RegularLocalTime);
			expect(p.findNext(new DateTime("2014-10-26T00:00:00 UTC")).toString()).to.equal("2014-10-26T02:00:00.000 UTC");
		});
		it("Should handle count >1", (): void => {
			var p = new Period(new DateTime("2014-01-01T00:00:00 Europe/Amsterdam"), 1, TimeUnit.Hour, PeriodDst.RegularLocalTime);
			expect(p.findNext(new DateTime("2014-02-01T01:00:00 Europe/Amsterdam"), 10).toString())
				.to.equal("2014-02-01T11:00:00.000 Europe/Amsterdam");
		});
		it("Should handle end-of-month for 28 < day < 31", (): void => {
			var p = new Period(new DateTime("2014-01-29T00:00:00 Europe/Amsterdam"), 1, TimeUnit.Month, PeriodDst.RegularLocalTime);
			expect(p.findNext(new DateTime("2014-01-29T00:00:00 Europe/Amsterdam"), 1).toString())
				.to.equal("2014-02-28T00:00:00.000 Europe/Amsterdam");
			expect(p.findNext(new DateTime("2014-01-29T00:00:00 Europe/Amsterdam"), 2).toString())
				.to.equal("2014-03-29T00:00:00.000 Europe/Amsterdam");
			expect(p.findNext(new DateTime("2014-01-29T00:00:00 Europe/Amsterdam"), 25).toString())
				.to.equal("2016-02-29T00:00:00.000 Europe/Amsterdam");
		});
		it("Should handle end-of-month for day == 31", (): void => {
			var p = new Period(new DateTime("2014-01-31T00:00:00 Europe/Amsterdam"), 1, TimeUnit.Month, PeriodDst.RegularLocalTime);
			expect(p.findNext(new DateTime("2014-01-31T00:00:00 Europe/Amsterdam"), 1).toString())
				.to.equal("2014-02-28T00:00:00.000 Europe/Amsterdam");
			expect(p.findNext(new DateTime("2014-01-31T00:00:00 Europe/Amsterdam"), 2).toString())
				.to.equal("2014-03-31T00:00:00.000 Europe/Amsterdam");
			expect(p.findNext(new DateTime("2014-01-31T00:00:00 Europe/Amsterdam"), 3).toString())
				.to.equal("2014-04-30T00:00:00.000 Europe/Amsterdam");
			expect(p.findNext(new DateTime("2014-01-29T00:00:00 Europe/Amsterdam"), 25).toString())
				.to.equal("2016-02-29T00:00:00.000 Europe/Amsterdam");
		});
	});

	describe("isBoundary()", (): void => {
		it("should return true for start date", (): void => {
			var p = new Period(new DateTime("2014-01-01T00:00:00 Europe/Amsterdam"), 1, TimeUnit.Hour, PeriodDst.RegularLocalTime);
			expect(p.isBoundary(new DateTime("2014-01-01T00:00:00 Europe/Amsterdam"))).to.be.true;
		});
		it("should return true for boundary date", (): void => {
			var p = new Period(new DateTime("2014-01-01T00:00:00 Europe/Amsterdam"), 1, TimeUnit.Hour, PeriodDst.RegularLocalTime);
			expect(p.isBoundary(new DateTime("2014-01-02T02:00:00 Europe/Amsterdam"))).to.be.true;
		});
		it("should return false for non-boundary date", (): void => {
			var p = new Period(new DateTime("2014-01-01T00:00:00 Europe/Amsterdam"), 1, TimeUnit.Hour, PeriodDst.RegularLocalTime);
			expect(p.isBoundary(new DateTime("2014-01-02T02:00:01 Europe/Amsterdam"))).to.be.false;
		});
		it("should return false for null date", (): void => {
			var p = new Period(new DateTime("2014-01-01T00:00:00 Europe/Amsterdam"), 1, TimeUnit.Hour, PeriodDst.RegularLocalTime);
			expect(p.isBoundary(null)).to.be.false;
		});
	});


	describe("toString()", (): void => {
		it("should work with naive date", (): void => {
			var p = new Period(new DateTime("2014-01-01T00:00:00"), 1, TimeUnit.Hour, PeriodDst.RegularLocalTime);
			expect(p.toString()).to.equal("1 hour, starting at 2014-01-01T00:00:00.000");
		});
		it("should work with PeriodDst.RegularLocalTime", (): void => {
			var p = new Period(new DateTime("2014-01-01T00:00:00 Europe/Amsterdam"), 1, TimeUnit.Hour, PeriodDst.RegularLocalTime);
			expect(p.toString()).to.equal("1 hour, starting at 2014-01-01T00:00:00.000 Europe/Amsterdam, keeping regular local time");
		});
		it("should work with PeriodDst.RegularIntervals", (): void => {
			var p = new Period(new DateTime("2014-01-01T00:00:00 Europe/Amsterdam"), 1, TimeUnit.Hour, PeriodDst.RegularIntervals);
			expect(p.toString()).to.equal("1 hour, starting at 2014-01-01T00:00:00.000 Europe/Amsterdam, keeping regular intervals");
		});
		it("should work with multiple hours", (): void => {
			var p = new Period(new DateTime("2014-01-01T00:00:00 Europe/Amsterdam"), 2, TimeUnit.Hour, PeriodDst.RegularIntervals);
			expect(p.toString()).to.equal("2 hours, starting at 2014-01-01T00:00:00.000 Europe/Amsterdam, keeping regular intervals");
		});
	});

	describe("toIsoString()", (): void => {
		it("should work", (): void => {
			expect((new Period(new DateTime("2014-01-01T00:00:00"), 1, TimeUnit.Second, PeriodDst.RegularLocalTime))
				.toIsoString())
				.to.equal("2014-01-01T00:00:00.000/P1S");
			expect((new Period(new DateTime("2014-01-01T00:00:00"), 1, TimeUnit.Minute, PeriodDst.RegularLocalTime))
				.toIsoString())
				.to.equal("2014-01-01T00:00:00.000/PT1M");
			expect((new Period(new DateTime("2014-01-01T00:00:00"), 1, TimeUnit.Hour, PeriodDst.RegularLocalTime))
				.toIsoString())
				.to.equal("2014-01-01T00:00:00.000/P1H");
			expect((new Period(new DateTime("2014-01-01T00:00:00"), 1, TimeUnit.Day, PeriodDst.RegularLocalTime))
				.toIsoString())
				.to.equal("2014-01-01T00:00:00.000/P1D");
			expect((new Period(new DateTime("2014-01-01T00:00:00"), 1, TimeUnit.Week, PeriodDst.RegularLocalTime))
				.toIsoString())
				.to.equal("2014-01-01T00:00:00.000/P1W");
			expect((new Period(new DateTime("2014-01-01T00:00:00"), 1, TimeUnit.Month, PeriodDst.RegularLocalTime))
				.toIsoString())
				.to.equal("2014-01-01T00:00:00.000/P1M");
			expect((new Period(new DateTime("2014-01-01T00:00:00"), 1, TimeUnit.Year, PeriodDst.RegularLocalTime))
				.toIsoString())
				.to.equal("2014-01-01T00:00:00.000/P1Y");
		});
	});

	describe("inspect()", (): void => {
		it("should work", (): void => {
			var p = new Period(new DateTime("2014-01-01T00:00:00"), 1, TimeUnit.Hour, PeriodDst.RegularLocalTime);
			expect(p.inspect()).to.equal("[Period: " + p.toString() + "]");
		});
	});

});
// todo test DST zone where DST save is not a whole hour (20 or 40 minutes)
// todo test zone with two DSTs
