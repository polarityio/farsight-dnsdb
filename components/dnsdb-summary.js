polarity.export = PolarityComponent.extend({
    details: Ember.computed.alias('block.data.details'),
    maxTagsInSummary: 3,
    uniqueTags: Ember.computed('details.results', function () {
        let uniqueTagSet = new Set();
        let results = this.get('details.results');
        let maxTags = this.get('details.maxTags');

        for (let i = 0; i < results.length; i++) {
            uniqueTagSet.add(results[i].rrname);
            if (uniqueTagSet.size >= maxTags) {
                break;
            }
        }

        return [...uniqueTagSet];
    })
});
