﻿/// <reference path="../typings/test.d.ts" />

import assert = require("assert");
import chai = require("chai");
import expect = chai.expect;

import datetimeFuncs = require("../lib/index");

import DateFunctions = datetimeFuncs.DateFunctions;
import DateTime = datetimeFuncs.DateTime;
import TimeSource = datetimeFuncs.TimeSource;
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

describe("TimeZone", (): void => {

	describe("local()", (): void => {
		it("should create a local time zone", (): void => {
			var t: TimeZone = TimeZone.local();
			var localOffset: number = (testTimeSource.now()).getTimezoneOffset();
			expect(t.offsetForZoneDate(testTimeSource.now(), DateFunctions.Get)).to.equal(-1 * localOffset);
			expect(t.offsetForUtcDate(testTimeSource.now(), DateFunctions.GetUTC)).to.equal(-1 * localOffset);
		});
		it("should cache the time zone objects", (): void => {
			var t: TimeZone = TimeZone.local();
			var u: TimeZone = TimeZone.local();
			expect(t).to.equal(u);
		});
	});

	describe("utc()", (): void => {
		it("should create a UTC zone", (): void => {
			var t: TimeZone = TimeZone.utc();
			expect(t.offsetForZone(2014, 2, 3, 4, 5, 6, 7)).to.equal(0);
			expect(t.offsetForUtc(2014, 2, 3, 4, 5, 6, 7)).to.equal(0);
		});
		it("should cache the time zone objects", (): void => {
			var t: TimeZone = TimeZone.utc();
			var u: TimeZone = TimeZone.utc();
			expect(t).to.equal(u);
		});
	});

	describe("zone(number)", (): void => {
		it("should create a time zone for a whole number", (): void => {
			var t: TimeZone = TimeZone.zone(60);
			expect(t.offsetForZone(2014, 7, 1, 2, 3, 4, 5)).to.equal(60);
			expect(t.offsetForUtc(2014, 7, 1, 2, 3, 4, 5)).to.equal(60);
		});
		it("should create a time zone for a negative number", (): void => {
			var t: TimeZone = TimeZone.zone(-60);
			expect(t.offsetForZone(2014, 7, 1, 2, 3, 4, 5)).to.equal(-60);
			expect(t.offsetForUtc(2014, 7, 1, 2, 3, 4, 5)).to.equal(-60);
		});
		it("should not handle DST", (): void => {
			var t: TimeZone = TimeZone.zone(-60);
			expect(t.offsetForZone(2014, 1, 1, 1, 2, 3, 4)).to.equal(-60);
			expect(t.offsetForZone(2014, 7, 1, 1, 2, 3, 4)).to.equal(-60);
		});
		it("should cache the time zone objects", (): void => {
			var t: TimeZone = TimeZone.zone(-60);
			var u: TimeZone = TimeZone.zone(-60);
			expect(t).to.equal(u);
		});
		assert.throws(function (): void { TimeZone.zone(-24 * 60); }, "zone(number) should throw on out of range offset");
		assert.throws(function (): void { TimeZone.zone(24 * 60); }, "zone(number) should throw on out of range offset");
	});

	describe("zone(string)", (): void => {
		it("should return NULL for an empty string", (): void => {
			var t: TimeZone = TimeZone.zone("");
			expect(t).to.be.null;
		});
		it("should create a time zone for a positive ISO offset", (): void => {
			var t: TimeZone = TimeZone.zone("+01:30");
			expect(t.offsetForUtc(2014, 1, 1, 1, 2, 3, 4)).to.equal(90);
		});
		it("should create a time zone for a negative ISO offset", (): void => {
			var t: TimeZone = TimeZone.zone("-01:30");
			expect(t.offsetForZone(2014, 1, 1, 1, 2, 3, 4)).to.equal(-90);
		});
		it("should create a time zone for an ISO offset without a colon", (): void => {
			var t: TimeZone = TimeZone.zone("+0130");
			expect(t.offsetForZone(2014, 1, 1, 1, 2, 3, 4)).to.equal(90);
		});
		it("should create a time zone for an ISO offset without minutes", (): void => {
			var t: TimeZone = TimeZone.zone("+01");
			expect(t.offsetForZone(2014, 1, 1, 1, 2, 3, 4)).to.equal(60);
		});
		it("should create a time zone for Zulu", (): void => {
			var t: TimeZone = TimeZone.zone("Z");
			expect(t.offsetForZone(2014, 1, 1, 1, 2, 3, 4)).to.equal(0);
		});
		it("should return a time zone for an IANA time zone string", (): void => {
			var t: TimeZone = TimeZone.zone("Africa/Asmara");
			expect(t.offsetForZone(2014, 1, 1, 1, 2, 3, 4)).to.equal(180);
		});
		it("should return a time zone for local time", (): void => {
			var t: TimeZone = TimeZone.zone("localtime");
			expect(t.equals(TimeZone.local())).to.be.true;
		});
		it("should cache the time zone objects", (): void => {
			var t: TimeZone = TimeZone.zone("-01:30");
			var u: TimeZone = TimeZone.zone("-01:30");
			expect(t).to.equal(u);
		});
		it("should cache the time zone objects even when different formats given", (): void => {
			var t: TimeZone = TimeZone.zone("Z");
			var u: TimeZone = TimeZone.zone("+00:00");
			expect(t).to.equal(u);
		});
		assert.throws(function (): void { TimeZone.zone("+24:00"); }, "zone(string) should throw on out of range input");
		assert.throws(function (): void { TimeZone.zone("-24:00"); }, "zone(string) should throw on out of range input");
	});

	describe("offsetForUtc()", (): void => {
		it("should work for local time", (): void => {
			var t = TimeZone.local();
			// check DST changes
			var d1 = new Date(2014, 1, 1, 1, 2, 3, 4);
			var d2 = new Date(2014, 7, 1, 1, 2, 3, 4);
			expect(t.offsetForUtc(2014, 1, 1, 1, 2, 3, 4)).to.equal(-1 * d1.getTimezoneOffset());
			expect(t.offsetForUtc(2014, 7, 1, 1, 2, 3, 4)).to.equal(-1 * d2.getTimezoneOffset());
		});
		it("should work for IANA zone", (): void => {
			var t = TimeZone.zone("America/Edmonton");
			// check DST changes
			expect(t.offsetForUtc(2014, 1, 1, 1, 2, 3, 4)).to.equal(-7 * 60);
			expect(t.offsetForUtc(2014, 7, 1, 1, 2, 3, 4)).to.equal(-6 * 60);
		});
		it("should work for around DST", (): void => {
			var t = TimeZone.zone("Europe/Amsterdam");
			expect(t.offsetForUtc(2014, 10, 26, 1, 59, 59, 0)).to.equal(60);
		});
		it("should work for fixed offset", (): void => {
			var t = TimeZone.zone("+0130");
			// check DST changes
			expect(t.offsetForUtc(2014, 1, 1, 1, 2, 3, 4)).to.equal(90);
			expect(t.offsetForUtc(2014, 7, 1, 1, 2, 3, 4)).to.equal(90);
		});
		it("should work if time not given", (): void => {
			var t = TimeZone.zone("+0130");
			expect(t.offsetForUtc(2014, 1, 1)).to.equal(90);
		});
	});

	describe("offsetForUtcDate()", (): void => {
		it("should with Get", (): void => {
			var t = TimeZone.zone("Europe/Amsterdam");
			var d = new Date(2014, 2, 26, 3, 0, 1, 0);
			expect(t.offsetForUtcDate(d, DateFunctions.Get)).to.equal(
				t.offsetForUtc(d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(),
					d.getMinutes(), d.getSeconds(), d.getMilliseconds()));
		});
		it("should with GetUtc", (): void => {
			var t = TimeZone.zone("Europe/Amsterdam");
			var d = new Date(2014, 2, 26, 3, 0, 1, 0);
			expect(t.offsetForUtcDate(d, DateFunctions.GetUTC)).to.equal(
				t.offsetForUtc(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours(),
					d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds()));
		});
	});


	describe("offsetForZone()", (): void => {
		it("should work for local time", (): void => {
			var t = TimeZone.local();
			// check DST changes
			var d1 = new Date(2014, 1, 1, 1, 2, 3, 4);
			var d2 = new Date(2014, 7, 1, 1, 2, 3, 4);
			expect(t.offsetForZone(2014, 1, 1, 1, 2, 3, 4)).to.equal(-1 * d1.getTimezoneOffset());
			expect(t.offsetForZone(2014, 7, 1, 1, 2, 3, 4)).to.equal(-1 * d2.getTimezoneOffset());
		});
		it("should work for IANA zone", (): void => {
			var t = TimeZone.zone("America/Edmonton");
			// check DST changes
			expect(t.offsetForZone(2014, 1, 1, 1, 2, 3, 4)).to.equal(-7 * 60);
			expect(t.offsetForZone(2014, 7, 1, 1, 2, 3, 4)).to.equal(-6 * 60);
		});

		// skipped because Date.getHours() is inconsistent at this moment:
		// if TZ environment variable is set to Europe/Amsterdam then that is different
		// from when the PC time zone is set to Europe/Amsterdam
		it("should work for non-existing DST forward time", (): void => {
			var t = TimeZone.zone("America/Edmonton");
			// check DST changes
			expect(t.offsetForZone(2014, 1, 1, 1, 2, 3, 4)).to.equal(-7 * 60);
			expect(t.offsetForZone(2014, 7, 1, 1, 2, 3, 4)).to.equal(-6 * 60);
			t = TimeZone.zone("Europe/Amsterdam");
			// non-existing europe/amsterdam date due to DST, should be processed as if rounded up to existing time
			expect(t.offsetForZone(2014, 3, 30, 2, 0, 0, 0)).to.equal(2 * 60);
		});
		it("should work for fixed offset", (): void => {
			var t = TimeZone.zone("+0130");
			// check DST changes
			expect(t.offsetForZone(2014, 1, 1, 1, 2, 3, 4)).to.equal(90);
			expect(t.offsetForZone(2014, 7, 1, 1, 2, 3, 4)).to.equal(90);
		});
		it("should work if time not given", (): void => {
			var t = TimeZone.zone("+0130");
			expect(t.offsetForZone(2014, 1, 1)).to.equal(90);
		});
	});

	describe("offsetForZoneDate()", (): void => {
		it("should with Get", (): void => {
			var t = TimeZone.zone("Europe/Amsterdam");
			var d = new Date(2014, 2, 26, 3, 0, 1, 0);
			expect(t.offsetForZoneDate(d, DateFunctions.Get)).to.equal(
				t.offsetForZone(d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(),
					d.getMinutes(), d.getSeconds(), d.getMilliseconds()));
		});
		it("should with GetUtc", (): void => {
			var t = TimeZone.zone("Europe/Amsterdam");
			var d = new Date(2014, 2, 26, 3, 0, 1, 0);
			expect(t.offsetForZoneDate(d, DateFunctions.GetUTC)).to.equal(
				t.offsetForZone(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours(),
					d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds()));
		});
	});

	describe("equals()", (): void => {
		it("should handle local zone", (): void => {
			expect(TimeZone.local().equals(TimeZone.local())).to.be.true;
			expect(TimeZone.local().equals(TimeZone.utc())).to.be.false;
			expect(TimeZone.local().equals(TimeZone.zone(6))).to.be.false;
		});
		it("should handle offset zone", (): void => {
			expect(TimeZone.zone(3).equals(TimeZone.zone(3))).to.be.true;
			expect(TimeZone.zone(3).equals(TimeZone.utc())).to.be.false;
			expect(TimeZone.zone(3).equals(TimeZone.local())).to.be.false;
			expect(TimeZone.zone(3).equals(TimeZone.zone(-1))).to.be.false;
		});
		it("should handle proper zone", (): void => {
			expect(TimeZone.zone("Europe/Amsterdam").equals(TimeZone.zone("Europe/Amsterdam"))).to.be.true;
			expect(TimeZone.zone("Europe/Amsterdam").equals(TimeZone.utc())).to.be.false;
			expect(TimeZone.zone("Europe/Amsterdam").equals(TimeZone.local())).to.be.false;
			expect(TimeZone.zone("Europe/Amsterdam").equals(TimeZone.zone(-1))).to.be.false;
		});
		it("should handle UTC in different forms", (): void => {
			expect(TimeZone.utc().equals(TimeZone.zone("GMT"))).to.be.true;
			expect(TimeZone.utc().equals(TimeZone.zone("UTC"))).to.be.true;
			expect(TimeZone.utc().equals(TimeZone.zone(0))).to.be.true;
		});
	});

	describe("inspect()", (): void => {
		it("should work", (): void => {
			expect(TimeZone.zone("Europe/Amsterdam").inspect()).to.equal("[TimeZone: Europe/Amsterdam]");
		});
	});

	describe("stringToOffset()", (): void => {
		it("should work for Z", (): void => {
			expect(TimeZone.stringToOffset("Z")).to.equal(0);
			expect(TimeZone.stringToOffset("+00:00")).to.equal(0);
			expect(TimeZone.stringToOffset("-01:30")).to.equal(-90);
			expect(TimeZone.stringToOffset("-01")).to.equal(-60);
		});
	});

	describe("hasDst()", (): void => {
		it("should work for local timezone", (): void => {
			expect(TimeZone.local().hasDst()).to.be.false;
		});
		it("should work for offset timezone", (): void => {
			expect(TimeZone.zone(3).hasDst()).to.be.false;
		});
		it("should work for named zone without DST", (): void => {
			expect(TimeZone.zone("UTC").hasDst()).to.be.false;
		});
		it("should work for named zone with DST", (): void => {
			expect(TimeZone.zone("Europe/Amsterdam").hasDst()).to.be.true;
		});
	});

	describe("abbreviationForUtc()", (): void => {
		it("should work for local timezone", (): void => {
			expect(TimeZone.local().abbreviationForUtc(2014, 1, 1)).to.equal("local");
		});
		it("should work for offset timezone", (): void => {
			expect(TimeZone.zone(3).abbreviationForUtc(2014, 1, 1)).to.equal(TimeZone.zone(3).toString());
		});
		it("should work for named zone without DST", (): void => {
			expect(TimeZone.zone("UTC").abbreviationForUtc(2014, 1, 1)).to.equal("UTC");
		});
		it("should work for named zone with DST", (): void => {
			// note that the underlying functionality is fully tested in test-tz-database
			expect(TimeZone.zone("Europe/Amsterdam").abbreviationForUtc(2014, 7, 1)).to.equal("CEST");
		});
	});
});

