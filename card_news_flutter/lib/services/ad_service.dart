import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AdService {
  static final AdService _instance = AdService._internal();

  factory AdService() {
    return _instance;
  }

  AdService._internal();

  static const int dailyFreeLimit = 3;
  static const String _usageKey = 'daily_usage_count';
  static const String _dateKey = 'usage_date';

  // Real Ad Unit IDs provided by user
  static const String bannerAdUnitId = 'ca-app-pub-8738237326772027/5592780949';
  static const String rewardedAdUnitId = 'ca-app-pub-8738237326772027/8310637146';

  // Test Ad Unit IDs (for safety during dev, but user wants real ones)
  // Use real ones as requested, but be aware they might not serve in test builds without test device ID.
  // Ideally, use test IDs for debug builds.
  // static const String bannerAdUnitIdTest = 'ca-app-pub-3940256099942544/6300978111';
  // static const String rewardedAdUnitIdTest = 'ca-app-pub-3940256099942544/5224354917';

  RewardedAd? _rewardedAd;
  bool _isRewardedAdReady = false;

  Future<void> initialize() async {
    await MobileAds.instance.initialize();
    _loadRewardedAd();
  }

  // --- Usage Tracking ---

  Future<int> getRemainingFreeUsage() async {
    final prefs = await SharedPreferences.getInstance();
    final today = DateTime.now().toIso8601String().split('T')[0];
    final lastDate = prefs.getString(_dateKey);

    if (lastDate != today) {
      // Reset for new day
      await prefs.setString(_dateKey, today);
      await prefs.setInt(_usageKey, 0);
      return dailyFreeLimit;
    }

    final usage = prefs.getInt(_usageKey) ?? 0;
    return dailyFreeLimit - usage;
  }

  Future<void> incrementUsage() async {
    final prefs = await SharedPreferences.getInstance();
    final usage = prefs.getInt(_usageKey) ?? 0;
    await prefs.setInt(_usageKey, usage + 1);
  }

  // --- Banner Ad ---

  BannerAd createBannerAd() {
    return BannerAd(
      adUnitId: bannerAdUnitId,
      size: AdSize.banner,
      request: AdRequest(),
      listener: BannerAdListener(
        onAdFailedToLoad: (ad, error) {
          print('Banner failed to load: $error');
          ad.dispose();
        },
      ),
    );
  }

  // --- Rewarded Ad ---

  void _loadRewardedAd() {
    RewardedAd.load(
      adUnitId: rewardedAdUnitId,
      request: AdRequest(),
      rewardedAdLoadCallback: RewardedAdLoadCallback(
        onAdLoaded: (ad) {
          _rewardedAd = ad;
          _isRewardedAdReady = true;
          print('Rewarded Ad loaded');
        },
        onAdFailedToLoad: (error) {
          print('Rewarded Ad failed to load: $error');
          _isRewardedAdReady = false;
          _rewardedAd = null;
        },
      ),
    );
  }

  /// Shows rewarded ad if available. Returns true if user earned reward.
  Future<bool> showRewardedAd(BuildContext context) async {
    print("AdService: showRewardedAd called");
    if (!_isRewardedAdReady || _rewardedAd == null) {
      print('AdService: Ad not ready, reloading...');
      _loadRewardedAd();
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('광고를 불러오는 중입니다. 잠시 후 다시 시도해주세요.')));
      return false;
    }

    Completer<bool> completer = Completer<bool>();
    bool localEarned = false;

    _rewardedAd!.fullScreenContentCallback = FullScreenContentCallback(
      onAdShowedFullScreenContent: (ad) {
        print("AdService: Ad showed full screen content.");
      },
      onAdDismissedFullScreenContent: (ad) {
        print("AdService: Ad dismissed. Earned: $localEarned");
        ad.dispose();
        _rewardedAd = null;
        _isRewardedAdReady = false;
        _loadRewardedAd();
        if (!completer.isCompleted) {
          completer.complete(localEarned);
        }
      },
      onAdFailedToShowFullScreenContent: (ad, error) {
        print("AdService: Ad failed to show: $error");
        ad.dispose();
        _rewardedAd = null;
        _isRewardedAdReady = false;
        _loadRewardedAd();
        if (!completer.isCompleted) {
          completer.complete(false);
        }
      },
    );

    print("AdService: Showing ad...");
    _rewardedAd!.setImmersiveMode(true);
    await _rewardedAd!.show(
      onUserEarnedReward: (ad, reward) {
        print("AdService: User earned reward: ${reward.type} ${reward.amount}");
        localEarned = true;
      },
    );
    
    // In case show() returns before dismissal (unlikely but possible depending on plugin version/platform)
    // We rely on the Completer completed by onAdDismissedFullScreenContent.
    return completer.future;
  }
}
